import type { Message } from '$lib/types';

/**
 * Walk up via `parentId` from `messageId` to the root, returning the
 * resulting linear chain in root-first order.
 *
 * @param messages — the full message list.
 * @param messageId — the message id at the chain's tail.
 * @returns the chain in root-first order. Empty when `messageId` is unknown.
 */
export function getChainTo(messages: Message[], messageId: string): Message[] {
	const byId = new Map(messages.map((m) => [m.id, m]));
	const chain: Message[] = [];
	let current = byId.get(messageId);
	while (current) {
		chain.push(current);
		current = current.parentId ? byId.get(current.parentId) : undefined;
	}
	return chain.reverse();
}

/**
 * Reconstruct the visible message thread for a conversation by walking
 * `activeChildMap` from the `'root'` key down to a leaf.
 *
 * @param messages — the full message list (will be filtered by `conversationId`).
 * @param conversationId — conversation whose thread to reconstruct.
 * @param activeChildMap — `parentId` (or `'root'`) → chosen child id at each fork.
 * @returns the messages on the active path in root-first order. Empty if
 *   the map has no `'root'` entry or the chain breaks immediately.
 */
export function getActivePath(
	messages: Message[],
	conversationId: string,
	activeChildMap: Record<string, string>
): Message[] {
	const byId = new Map(
		messages.filter((m) => m.conversationId === conversationId).map((m) => [m.id, m])
	);

	const path: Message[] = [];
	let nextId: string | undefined = activeChildMap['root'];

	while (nextId) {
		const msg = byId.get(nextId);
		if (!msg) break;
		path.push(msg);
		nextId = activeChildMap[msg.id];
	}

	return path;
}

/**
 * Collect every message that shares a parent with the given message
 * (including the message itself). Used to render the `← N/M →` switcher.
 *
 * @param messages — the full message list. Filtered by both `parentId` and
 *   `conversationId`.
 * @param messageId — the id of the message whose siblings we want.
 * @returns siblings sorted by `createdAt` ascending. Empty if `messageId`
 *   is unknown; a single-element array if the message has no siblings.
 */
export function getSiblings(messages: Message[], messageId: string): Message[] {
	const target = messages.find((m) => m.id === messageId);
	if (!target) return [];
	return messages
		.filter((m) => m.parentId === target.parentId && m.conversationId === target.conversationId)
		.sort((a, b) => a.createdAt - b.createdAt);
}
