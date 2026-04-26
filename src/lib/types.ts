export type Role = 'user' | 'assistant';

/**
 * A node in a per-conversation message tree.
 *
 * Editing or regenerating creates a sibling under the same `parentId`
 * the visible thread is reconstructed by walking
 * `parentId` up from {@link Conversation.tailId} (see `getActivePath`).
 *
 * Stored as a single flat array in localStorage, filtered by
 * `conversationId` on read.
 */
export interface Message {
	id: string;
	conversationId: string;
	parentId: string | null;
	role: Role;
	content: string; // appended to in real time while streaming
	model: string; // OpenRouter model id
	createdAt: number;
	reasoning?: string; // chain-of-thought for reasoning models; undefined otherwise
}

/**
 * The container around a tree of {@link Message}s. Tracks which branch is
 * currently visible (`tailId` + `activeChildMap`) and which model the next
 * user turn will use (`model`).
 */
export interface Conversation {
	id: string;
	title: string;
	model: string; // model for the *next* user turn;
	tailId: string | null; // tip of the visible branch
	activeChildMap: Record<string, string>; // parentId (or 'root') → chosen child id at each fork
	createdAt: number;
	updatedAt: number;
	autoTitlePending?: boolean; // true until an AI title lands or the user renames
}
