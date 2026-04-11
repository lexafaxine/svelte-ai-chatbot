import { nanoid } from 'nanoid';
import { browser } from '$app/environment';
import type { Conversation, Message, Role } from '$lib/types';
import { DEFAULT_MODEL } from '$lib/config/models';
import { getActivePath } from '$lib/utils/message-tree';
import { loadConversations, saveConversations, loadMessages, saveMessages } from './persistence';

function createChatStore() {
	let conversations = $state<Conversation[]>(browser ? loadConversations() : []);
	let messages = $state<Message[]>(browser ? loadMessages() : []);

	let streamingMessageId = $state<string | null>(null);
	let streamError = $state<string | null>(null);
	let streamAbort: AbortController | null = null;

	if (browser) {
		$effect.root(() => {
			$effect(() => saveConversations(conversations));
			$effect(() => saveMessages(messages));
		});
	}

	function touchConversation(id: string, patch: Partial<Conversation> = {}) {
		conversations = conversations.map((c) =>
			c.id === id ? { ...c, ...patch, updatedAt: Date.now() } : c
		);
	}

	function createConversation(model: string = DEFAULT_MODEL): Conversation {
		const now = Date.now();
		const conversation: Conversation = {
			id: nanoid(),
			title: 'New chat',
			model,
			tailId: null,
			createdAt: now,
			updatedAt: now
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
		touchConversation(conversationId, { tailId: message.id });
		return message;
	}

	function updateMessageContent(id: string, content: string) {
		messages = messages.map((m) => (m.id === id ? { ...m, content } : m));
	}

	function setTail(conversationId: string, tailId: string | null) {
		touchConversation(conversationId, { tailId });
	}

	function setConversationTitle(id: string, title: string) {
		touchConversation(id, { title });
	}

	function setConversationModel(id: string, model: string) {
		touchConversation(id, { model });
	}

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

		streamingMessageId = assistant.id;
		streamError = null;
		streamAbort = new AbortController();

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: pathUpToUser, model: conversation.model }),
				signal: streamAbort.signal
			});

			if (!response.ok || !response.body) {
				const errText = await response.text().catch(() => '');
				throw new Error(errText || `Request failed with status ${response.status}`);
			}

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let content = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				content += decoder.decode(value, { stream: true });
				updateMessageContent(assistant.id, content);
			}
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				// user cancelled — keep whatever partial content was already written
			} else {
				streamError = err instanceof Error ? err.message : String(err);
			}
		} finally {
			streamingMessageId = null;
			streamAbort = null;
		}
	}

	function stopStreaming() {
		streamAbort?.abort();
	}

	function clearStreamError() {
		streamError = null;
	}

	return {
		get conversations() {
			return conversations;
		},
		get messages() {
			return messages;
		},
		get streamingMessageId() {
			return streamingMessageId;
		},
		get streamError() {
			return streamError;
		},
		createConversation,
		deleteConversation,
		getConversation,
		appendMessage,
		updateMessageContent,
		setTail,
		setConversationTitle,
		setConversationModel,
		streamReply,
		stopStreaming,
		clearStreamError
	};
}

export const chat = createChatStore();
