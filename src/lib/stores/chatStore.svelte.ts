import { nanoid } from 'nanoid';
import { browser } from '$app/environment';
import type { Conversation, Message, Role } from '$lib/types';
import { DEFAULT_MODEL } from '$lib/config/models';
import {
	loadConversations,
	saveConversations,
	loadMessages,
	saveMessages,
	loadActiveConversationId,
	saveActiveConversationId
} from './persistence';

function createChatStore() {
	let conversations = $state<Conversation[]>(browser ? loadConversations() : []);
	let messages = $state<Message[]>(browser ? loadMessages() : []);
	let activeConversationId = $state<string | null>(browser ? loadActiveConversationId() : null);

	if (browser) {
		$effect.root(() => {
			$effect(() => saveConversations(conversations));
			$effect(() => saveMessages(messages));
			$effect(() => saveActiveConversationId(activeConversationId));
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
		activeConversationId = conversation.id;
		return conversation;
	}

	function deleteConversation(id: string) {
		conversations = conversations.filter((c) => c.id !== id);
		messages = messages.filter((m) => m.conversationId !== id);
		if (activeConversationId === id) {
			activeConversationId = conversations[0]?.id ?? null;
		}
	}

	function setActiveConversation(id: string | null) {
		activeConversationId = id;
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

	return {
		get conversations() {
			return conversations;
		},
		get messages() {
			return messages;
		},
		get activeConversationId() {
			return activeConversationId;
		},
		get activeConversation(): Conversation | null {
			return conversations.find((c) => c.id === activeConversationId) ?? null;
		},
		createConversation,
		deleteConversation,
		setActiveConversation,
		appendMessage,
		updateMessageContent,
		setTail,
		setConversationTitle,
		setConversationModel
	};
}

export const chat = createChatStore();
