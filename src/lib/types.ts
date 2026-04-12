export type Role = 'user' | 'assistant';

export interface Message {
	id: string;
	conversationId: string;
	parentId: string | null;
	role: Role;
	content: string;
	model: string;
	createdAt: number;
	reasoning?: string;
}

export interface Conversation {
	id: string;
	title: string;
	model: string;
	tailId: string | null;
	activeChildMap: Record<string, string>;
	createdAt: number;
	updatedAt: number;
}
