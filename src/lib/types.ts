export type Role = 'user' | 'assistant';

export interface Message {
	id: string;
	conversationId: string;
	parentId: string | null;
	role: Role;
	content: string;
	model: string;
	createdAt: number;
}

export interface Conversation {
	id: string;
	title: string;
	model: string;
	tailId: string | null;
	createdAt: number;
	updatedAt: number;
}
