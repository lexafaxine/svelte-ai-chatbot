import { nanoid } from 'nanoid';
import { browser } from '$app/environment';
import type { Conversation, Message, Role } from '$lib/types';
import { DEFAULT_MODEL } from '$lib/config/models';
import { getActivePath, getLeafDescendant } from '$lib/utils/message-tree';
import { sanitizeTitle, makePreliminaryTitle, DEFAULT_TITLE } from '$lib/utils/title';
import { buildFork, type ForkMode } from '$lib/utils/fork';
import { streamChat, requestTitle } from '$lib/api/chatApi';
import { loadConversations, saveConversations, loadMessages, saveMessages } from './persistence';

const STOPPED_MESSAGE = 'You stopped the response';

/**
 * Build the singleton chat store. Owns the full conversation + message
 * state, the per-conversation streaming/error slots, and all CRUD,
 * branching, streaming, and forking operations.
 */
function createChatStore() {
	let conversations = $state.raw<Conversation[]>(browser ? loadConversations() : []);
	let messages = $state.raw<Message[]>(browser ? loadMessages() : []);

	// Per-conversation streaming state so multiple conversations can stream
	// concurrently. Keys are conversationId; values are the assistant message
	// id / error string.
	let streamingByConv = $state<Record<string, string>>({});
	let errorByConv = $state<Record<string, string>>({});
	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- not reactive, only used imperatively
	const abortByConv = new Map<string, AbortController>();

	if (browser) {
		$effect.root(() => {
			$effect(() => saveConversations(conversations));
			$effect(() => saveMessages(messages));
		});
	}

	/**
	 * Apply a partial update to a conversation by id and optionally bump
	 * `updatedAt`. No-op if the id isn't found.
	 *
	 * @param id — conversation id.
	 * @param patch — fields to merge in.
	 * @param updateTime — when `true` (default) sets `updatedAt = Date.now()`.
	 */
	function touchConversation(id: string, patch: Partial<Conversation> = {}, updateTime = true) {
		conversations = conversations.map((c) =>
			c.id === id ? { ...c, ...patch, ...(updateTime ? { updatedAt: Date.now() } : {}) } : c
		);
	}

	function createConversation(model: string = DEFAULT_MODEL): Conversation {
		const now = Date.now();
		const conversation: Conversation = {
			id: nanoid(),
			title: DEFAULT_TITLE,
			model,
			tailId: null,
			activeChildMap: {},
			createdAt: now,
			updatedAt: now,
			autoTitlePending: true
		};
		conversations = [conversation, ...conversations];
		return conversation;
	}

	function deleteConversation(id: string) {
		conversations = conversations.filter((c) => c.id !== id);
		messages = messages.filter((m) => m.conversationId !== id);
	}

	function getConversation(id: string): Conversation | null {
		return conversations.find((c) => c.id === id) ?? null;
	}

	/**
	 * Record which child should be considered "active" at a given fork point.
	 *
	 * @param conversationId — conversation containing the fork.
	 * @param parentId — fork-point parent id; `null` for root-level forks.
	 * @param childId — id of the child to make active (visible) at that fork.
	 */
	function updateActiveChild(conversationId: string, parentId: string | null, childId: string) {
		const conv = getConversation(conversationId);
		if (!conv) return;
		const key = parentId ?? 'root';
		const map = { ...conv.activeChildMap, [key]: childId };
		touchConversation(conversationId, { activeChildMap: map });
	}

	/**
	 * Append a new message under `parentId` and advance the conversation's
	 * `tailId` to it. If this is the first user message, also seeds a
	 * preliminary title (later replaced by the AI title).
	 *
	 * @param conversationId — conversation to append to.
	 * @param role — `'user'` or `'assistant'`.
	 * @param content — initial text (empty for assistant messages that will be streamed into).
	 * @param parentId — parent message id; `null` for the root message.
	 * @param model — model id to record on the message.
	 * @returns the new message.
	 */
	function appendMessage(
		conversationId: string,
		role: Role,
		content: string,
		parentId: string | null,
		model: string
	): Message {
		const message: Message = {
			id: nanoid(),
			conversationId,
			parentId,
			role,
			content,
			model,
			createdAt: Date.now()
		};
		messages = [...messages, message];
		updateActiveChild(conversationId, parentId, message.id);

		const conv = getConversation(conversationId);
		const patch: Partial<Conversation> = { tailId: message.id };
		if (role === 'user' && parentId === null && conv?.autoTitlePending) {
			patch.title = makePreliminaryTitle(content);
		}
		touchConversation(conversationId, patch);
		return message;
	}

	function patchMessage(id: string, patch: Partial<Message>) {
		messages = messages.map((m) => (m.id === id ? { ...m, ...patch } : m));
	}

	/**
	 * Rename a conversation and clear `autoTitlePending` so the AI title
	 * generator stops trying to overwrite it. Does not bump `updatedAt`.
	 *
	 * @param id — conversation id.
	 * @param title — new title.
	 */
	function setConversationTitle(id: string, title: string) {
		touchConversation(id, { title, autoTitlePending: false }, false);
	}

	/**
	 * Change the model used for the next user turn in this conversation.
	 *
	 * @param id — conversation id.
	 * @param model — new model id.
	 */
	function setConversationModel(id: string, model: string) {
		touchConversation(id, { model });
	}

	/**
	 * Switch the visible branch at a fork point to a different sibling, then
	 * descend along that branch to a leaf so the full new path is visible.
	 *
	 * @param conversationId — conversation id.
	 * @param targetMessageId — sibling to switch to.
	 */
	function switchSibling(conversationId: string, targetMessageId: string) {
		const target = messages.find((m) => m.id === targetMessageId);
		if (!target) return;

		const conv = getConversation(conversationId);
		if (!conv) return;

		const map = { ...conv.activeChildMap, [target.parentId ?? 'root']: targetMessageId };
		const leafId = getLeafDescendant(messages, targetMessageId, map);
		touchConversation(conversationId, { activeChildMap: map, tailId: leafId });
	}

	/**
	 * Re-stream a fresh assistant reply as a sibling of an existing one
	 * (same parent user message). The new reply becomes the active branch.
	 *
	 * @param conversationId — conversation id.
	 * @param assistantMessageId — id of the assistant message to regenerate from.
	 */
	function regenerate(conversationId: string, assistantMessageId: string) {
		const assistant = messages.find((m) => m.id === assistantMessageId);
		if (!assistant || assistant.role !== 'assistant' || !assistant.parentId) return;
		streamReply(conversationId, assistant.parentId);
	}

	/**
	 * Insert a new user message as a sibling of an existing one (same
	 * parent), then stream a fresh assistant reply under it. The original
	 * branch stays in storage but falls off the active path.
	 *
	 * @param conversationId — conversation id.
	 * @param oldUserMsgId — user message being edited.
	 * @param newContent — replacement text.
	 */
	function editAndResubmit(conversationId: string, oldUserMsgId: string, newContent: string) {
		const oldMsg = messages.find((m) => m.id === oldUserMsgId);
		if (!oldMsg || oldMsg.role !== 'user') return;

		const conv = getConversation(conversationId);
		if (!conv) return;

		const newUserMsg = appendMessage(
			conversationId,
			'user',
			newContent,
			oldMsg.parentId,
			conv.model
		);
		streamReply(conversationId, newUserMsg.id);
	}

	/**
	 * Append an empty assistant message under `userMessageId`, then read
	 * events from {@link streamChat} into it. Text and reasoning deltas
	 * are appended to the message's `content` / `reasoning`. An `error`
	 * event is stored on the per-conversation error slot.
	 *
	 * On abort: if no tokens had arrived, replace the placeholder with
	 * {@link STOPPED_MESSAGE}; otherwise keep the partial text. Starting
	 * a new stream while one is running aborts the previous one first.
	 *
	 * @param conversationId — conversation id.
	 * @param userMessageId — id of the user message that should become the parent of the new reply.
	 * @returns a promise that resolves once the stream completes (or aborts / errors).
	 */
	async function streamReply(conversationId: string, userMessageId: string): Promise<void> {
		const conversation = getConversation(conversationId);
		if (!conversation) return;

		const pathUpToUser = getActivePath(messages, userMessageId).map((m) => ({
			role: m.role,
			content: m.content
		}));

		const assistant = appendMessage(
			conversationId,
			'assistant',
			'',
			userMessageId,
			conversation.model
		);

		// If this conversation already has a stream running, abort it first.
		abortByConv.get(conversationId)?.abort();

		const abort = new AbortController();
		abortByConv.set(conversationId, abort);
		streamingByConv = { ...streamingByConv, [conversationId]: assistant.id };
		errorByConv = Object.fromEntries(
			Object.entries(errorByConv).filter(([k]) => k !== conversationId)
		);

		let content = '';
		let reasoning = '';
		let serverError: string | null = null;

		try {
			for await (const event of streamChat({
				messages: pathUpToUser,
				model: conversation.model,
				signal: abort.signal
			})) {
				if (event.type === 'text') {
					content += event.delta;
					patchMessage(assistant.id, { content });
				} else if (event.type === 'reasoning') {
					reasoning += event.delta;
					patchMessage(assistant.id, { reasoning });
				} else if (event.type === 'error') {
					serverError = event.message;
				}
			}

			if (serverError) {
				errorByConv = { ...errorByConv, [conversationId]: serverError };
			} else if (content) {
				const userMsg = messages.find((m) => m.id === userMessageId);
				if (userMsg) {
					void generateTitle(conversationId, userMsg.content, content);
				}
			}
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				if (!content && !reasoning) {
					patchMessage(assistant.id, { content: STOPPED_MESSAGE });
				}
			} else {
				const msg = err instanceof Error ? err.message : String(err);
				errorByConv = { ...errorByConv, [conversationId]: msg };
			}
		} finally {
			streamingByConv = Object.fromEntries(
				Object.entries(streamingByConv).filter(([k]) => k !== conversationId)
			);
			if (abortByConv.get(conversationId) === abort) {
				abortByConv.delete(conversationId);
			}
		}
	}

	/**
	 * Best-effort AI title generation. No-op if the conversation no longer
	 * needs an auto-title (was deleted, renamed, or already titled).
	 *
	 * @param conversationId — conversation id.
	 * @param userText — first user message content.
	 * @param assistantText — first assistant reply content.
	 */
	async function generateTitle(conversationId: string, userText: string, assistantText: string) {
		const conv = getConversation(conversationId);
		if (!conv?.autoTitlePending) return;

		const title = await requestTitle({
			userMessage: userText,
			assistantMessage: assistantText,
			model: conv.model
		});
		if (!title) return;

		const clean = sanitizeTitle(title);
		// Re-check: conversation may have been deleted or renamed while we awaited.
		const latest = getConversation(conversationId);
		if (!clean || !latest?.autoTitlePending) return;
		setConversationTitle(conversationId, clean);
	}

	function stopStreaming(conversationId: string) {
		abortByConv.get(conversationId)?.abort();
	}

	function clearStreamError(conversationId: string) {
		if (conversationId in errorByConv) {
			errorByConv = Object.fromEntries(
				Object.entries(errorByConv).filter(([k]) => k !== conversationId)
			);
		}
	}

	/**
	 * Clone a conversation up to a chosen message into a brand-new
	 * conversation.
	 *
	 * @param conversationId — source conversation id.
	 * @param atMessageId — message that becomes the new tail.
	 * @param mode — `'active-path'` to clone the visible thread only; `'full-history'` to keep every branch.
	 * @returns the new conversation's id, or `null` if the source / target was missing or yielded no messages.
	 */
	function forkConversation(
		conversationId: string,
		atMessageId: string,
		mode: ForkMode
	): string | null {
		const source = getConversation(conversationId);
		if (!source) return null;

		const sourceMessages = messages.filter((m) => m.conversationId === conversationId);
		const result = buildFork({ source, sourceMessages, atMessageId, mode });
		if (!result) return null;

		conversations = [result.conversation, ...conversations];
		messages = [...messages, ...result.messages];
		return result.conversation.id;
	}

	return {
		get conversations() {
			return conversations;
		},
		get messages() {
			return messages;
		},
		streamingMessageIdFor(conversationId: string): string | null {
			return streamingByConv[conversationId] ?? null;
		},
		streamErrorFor(conversationId: string): string | null {
			return errorByConv[conversationId] ?? null;
		},
		createConversation,
		deleteConversation,
		getConversation,
		appendMessage,
		patchMessage,
		setConversationTitle,
		setConversationModel,
		switchSibling,
		regenerate,
		editAndResubmit,
		streamReply,
		stopStreaming,
		clearStreamError,
		forkConversation
	};
}

export const chat = createChatStore();
