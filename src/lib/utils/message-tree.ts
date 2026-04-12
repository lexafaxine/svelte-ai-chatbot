import type { Message } from '$lib/types';

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

export function getSiblings(messages: Message[], messageId: string): Message[] {
	const target = messages.find((m) => m.id === messageId);
	if (!target) return [];
	return messages
		.filter((m) => m.parentId === target.parentId && m.conversationId === target.conversationId)
		.sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * Walk down from `startId` following `activeChildMap` until reaching a leaf.
 * When a node has children but no entry in the map, the latest child is picked
 * and recorded into `activeChildMap` (mutated in place).
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
