import type { Message } from '$lib/types';

/**
 * Reconstruct the visible message thread for a conversation by walking
 * `parentId` from `tailId` up to the root.
 *
 * @param messages — the full message list. Only
 *   messages reachable from `tailId` are inspected;
 * @param tailId — the tip of the visible branch
 *   ({@link import('$lib/types').Conversation.tailId}), or `null`.
 * @returns the messages on the active path in root-first order. Empty if
 *   `tailId` is `null` or unknown.
 */
export function getActivePath(messages: Message[], tailId: string | null): Message[] {
	if (!tailId) return [];
	const byId = new Map(messages.map((m) => [m.id, m]));
	const path: Message[] = [];

	let current = byId.get(tailId);
	while (current) {
		path.push(current);
		current = current.parentId ? byId.get(current.parentId) : undefined;
	}

	return path.reverse();
}

/**
 * Collect every message that shares a parent with the given message
 * (including the message itself). Used to render the `← N/M →` switcher.
 *
 * @param messages — the full message list. Filtered by both `parentId` and
 *   `conversationId`
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

/**
 * Walk down from `startId` following `activeChildMap` until a leaf is
 * reached. When a node has children but no entry in the map, the latest
 * child (highest `createdAt`) is picked and recorded into `activeChildMap`
 *
 * @param messages — the full message list.
 * @param startId — the message id to start descending from.
 * @param activeChildMap — mutated in place: any auto-picked branch decision
 *   is written back so re-renders are stable.
 * @returns the leaf message id reached at the bottom of the descent.
 *   Equals `startId` if it has no children.
 */
export function getLeafDescendant(
	messages: Message[],
	startId: string,
	activeChildMap: Record<string, string>
): string {
	const childrenOf = new Map<string, Message[]>();
	for (const m of messages) {
		if (m.parentId) {
			const list = childrenOf.get(m.parentId);
			if (list) list.push(m);
			else childrenOf.set(m.parentId, [m]);
		}
	}

	let currentId = startId;
	while (true) {
		const children = childrenOf.get(currentId);
		if (!children || children.length === 0) return currentId;

		const mapped = activeChildMap[currentId];
		if (mapped && children.some((c) => c.id === mapped)) {
			currentId = mapped;
		} else {
			const latest = children.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
			activeChildMap[currentId] = latest.id;
			currentId = latest.id;
		}
	}
}
