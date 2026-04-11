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
		.filter((m) => m.parentId === target.parentId)
		.sort((a, b) => a.createdAt - b.createdAt);
}
