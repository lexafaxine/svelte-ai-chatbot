import { nanoid } from 'nanoid';
import { browser } from '$app/environment';
import type { Conversation, Message, Role } from '$lib/types';
import { DEFAULT_MODEL } from '$lib/config/models';
import { getActivePath, getLeafDescendant } from '$lib/utils/message-tree';
import {
	loadConversations,
	saveConversations,
	loadMessages,
	saveMessages,
	loadApiKey
} from './persistence';

type StreamEvent =
	| { type: 'text'; delta: string }
	| { type: 'reasoning'; delta: string }
	| { type: 'error'; message: string };

const STOPPED_MESSAGE = 'You stopped the response';
const DEFAULT_TITLE = 'New chat';
const MAX_TITLE_LEN = 60;
const PRELIMINARY_TITLE_LEN = 50;

function sanitizeTitle(raw: string): string {
	let t = raw.trim().replace(/\s+/g, ' ');
	// Strip leading/trailing matched quotes (single, double, or CJK) — models
	// love to wrap titles even when told not to.
	t = t.replace(/^["'“”‘’《「『]+|["'“”‘’》」』.。!！?？,，;；:：]+$/g, '').trim();
	if (t.length > MAX_TITLE_LEN) t = t.slice(0, MAX_TITLE_LEN).trimEnd() + '…';
	return t;
}

function makePreliminaryTitle(text: string): string {
	const normalized = text.trim().replace(/\s+/g, ' ');
	if (!normalized) return DEFAULT_TITLE;
	if (normalized.length <= PRELIMINARY_TITLE_LEN) return normalized;
	return normalized.slice(0, PRELIMINARY_TITLE_LEN).trimEnd() + '…';
}

function createChatStore() {
	let conversations = $state<Conversation[]>(browser ? loadConversations() : []);
	let messages = $state<Message[]>(browser ? loadMessages() : []);

	// Per-conversation streaming state so multiple conversations can stream concurrently.
	// Keys are conversationId; values are the assistant message id / error string.
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

	function updateActiveChild(conversationId: string, parentId: string | null, childId: string) {
		const conv = getConversation(conversationId);
		if (!conv) return;
		const key = parentId ?? 'root';
		const map = { ...conv.activeChildMap, [key]: childId };
		touchConversation(conversationId, { activeChildMap: map });
	}

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

	function setTail(conversationId: string, tailId: string | null) {
		touchConversation(conversationId, { tailId });
	}

	function setConversationTitle(id: string, title: string) {
		touchConversation(id, { title, autoTitlePending: false }, false);
	}

	function setConversationModel(id: string, model: string) {
		touchConversation(id, { model });
	}

	function switchSibling(conversationId: string, targetMessageId: string) {
		const target = messages.find((m) => m.id === targetMessageId);
		if (!target) return;

		const conv = getConversation(conversationId);
		if (!conv) return;

		const map = { ...conv.activeChildMap, [target.parentId ?? 'root']: targetMessageId };
		const leafId = getLeafDescendant(messages, targetMessageId, map);
		touchConversation(conversationId, { activeChildMap: map, tailId: leafId });
	}

	function regenerate(conversationId: string, assistantMessageId: string) {
		const assistant = messages.find((m) => m.id === assistantMessageId);
		if (!assistant || assistant.role !== 'assistant' || !assistant.parentId) return;
		streamReply(conversationId, assistant.parentId);
	}

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
	 * Append an empty assistant message as a child of `userMessageId`, then
	 * stream a reply into it from `/api/chat`.
	 *
	 * Wire protocol: the server returns NDJSON, one JSON object per line, of
	 * shape `{type: 'text'|'reasoning', delta}` or `{type: 'error', message}`.
	 * Text / reasoning deltas are accumulated into the assistant's `content` /
	 * `reasoning` via `patchMessage`. An `error` frame is surfaced on the
	 * per-conversation `streamError` slot without throwing.
	 *
	 * Abort: callers trigger `stopStreaming(conversationId)` which fires the
	 * stored AbortController. On abort we overwrite the placeholder with
	 * STOPPED_MESSAGE *only* when no tokens had arrived — partial outputs are
	 * left intact so the message remains valid history for the next turn.
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

		// If this conversation already has a stream running, abort it first
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
			const headers: Record<string, string> = { 'Content-Type': 'application/json' };
			const apiKey = loadApiKey();
			if (apiKey) headers['x-openrouter-key'] = apiKey;

			const response = await fetch('/api/chat', {
				method: 'POST',
				headers,
				body: JSON.stringify({ messages: pathUpToUser, model: conversation.model }),
				signal: abort.signal
			});

			if (!response.ok || !response.body) {
				const errText = await response.text().catch(() => '');
				throw new Error(errText || `Request failed with status ${response.status}`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });

				let newlineIndex = buffer.indexOf('\n');
				while (newlineIndex !== -1) {
					const line = buffer.slice(0, newlineIndex).trim();
					buffer = buffer.slice(newlineIndex + 1);
					newlineIndex = buffer.indexOf('\n');
					if (!line) continue;

					let event: StreamEvent;
					try {
						event = JSON.parse(line) as StreamEvent;
					} catch {
						continue;
					}

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
			}

			if (serverError) {
				errorByConv = { ...errorByConv, [conversationId]: serverError };
			} else if (content) {
				// generate AI title when first response success
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

	async function generateTitle(conversationId: string, userText: string, assistantText: string) {
		const conv = getConversation(conversationId);
		if (!conv?.autoTitlePending) return;

		try {
			const headers: Record<string, string> = { 'Content-Type': 'application/json' };
			const apiKey = loadApiKey();
			if (apiKey) headers['x-openrouter-key'] = apiKey;

			const response = await fetch('/api/title', {
				method: 'POST',
				headers,
				body: JSON.stringify({
					userMessage: userText,
					assistantMessage: assistantText,
					model: conv.model
				})
			});
			if (!response.ok) return;
			const { title } = (await response.json()) as { title?: string };
			if (!title) return;

			const clean = sanitizeTitle(title);
			// Re-check: conversation may have been deleted or renamed while we awaited.
			const latest = getConversation(conversationId);
			if (!clean || !latest?.autoTitlePending) return;
			setConversationTitle(conversationId, clean);
		} catch {
			// Silent: title generation is best-effort.
		}
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
		setTail,
		setConversationTitle,
		setConversationModel,
		switchSibling,
		regenerate,
		editAndResubmit,
		streamReply,
		stopStreaming,
		clearStreamError
	};
}

export const chat = createChatStore();
