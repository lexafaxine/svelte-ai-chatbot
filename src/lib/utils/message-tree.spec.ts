import { describe, it, expect } from 'vitest';
import { getActivePath, getSiblings } from './message-tree';
import type { Message } from '$lib/types';

function msg(overrides: Partial<Message> & { id: string }): Message {
	return {
		id: overrides.id,
		conversationId: 'c1',
		parentId: null,
		role: 'user',
		content: '',
		model: 'm',
		createdAt: 0,
		...overrides
	};
}

describe('getActivePath', () => {
	it('returns empty array when tailId is null', () => {
		expect(getActivePath([], null)).toEqual([]);
	});

	it('returns empty array when tailId is not found in messages', () => {
		const messages = [msg({ id: 'a' })];
		expect(getActivePath(messages, 'ghost')).toEqual([]);
	});

	it('walks up a linear chain and returns root-first order', () => {
		const a = msg({ id: 'a', parentId: null });
		const b = msg({ id: 'b', parentId: 'a' });
		const c = msg({ id: 'c', parentId: 'b' });

		const path = getActivePath([c, a, b], 'c');

		expect(path.map((m) => m.id)).toEqual(['a', 'b', 'c']);
	});

	it('ignores sibling branches that are not on the path to tailId', () => {
		const u = msg({ id: 'u', parentId: null, role: 'user' });
		const a1 = msg({ id: 'a1', parentId: 'u', role: 'assistant' });
		const a2 = msg({ id: 'a2', parentId: 'u', role: 'assistant' });

		const path = getActivePath([u, a1, a2], 'a2');

		expect(path.map((m) => m.id)).toEqual(['u', 'a2']);
	});

	it('stops at the first message whose parent does not exist (orphan chain)', () => {
		const orphan = msg({ id: 'o', parentId: 'missing' });
		const path = getActivePath([orphan], 'o');
		expect(path.map((m) => m.id)).toEqual(['o']);
	});
});

describe('getSiblings', () => {
	it('returns empty array for unknown messageId', () => {
		expect(getSiblings([], 'ghost')).toEqual([]);
	});

	it('returns all messages sharing the same parentId, including self', () => {
		const a1 = msg({ id: 'a1', parentId: 'u', createdAt: 2 });
		const a2 = msg({ id: 'a2', parentId: 'u', createdAt: 1 });
		const other = msg({ id: 'other', parentId: 'v' });

		const siblings = getSiblings([a1, a2, other], 'a1');

		expect(siblings.map((m) => m.id)).toEqual(['a2', 'a1']);
	});

	it('handles root-level siblings (parentId: null)', () => {
		const r1 = msg({ id: 'r1', parentId: null, createdAt: 1 });
		const r2 = msg({ id: 'r2', parentId: null, createdAt: 2 });
		const child = msg({ id: 'child', parentId: 'r1' });

		const siblings = getSiblings([r1, r2, child], 'r1');

		expect(siblings.map((m) => m.id)).toEqual(['r1', 'r2']);
	});

	it('returns a single-element array when the message has no siblings', () => {
		const only = msg({ id: 'only', parentId: 'p' });
		expect(getSiblings([only], 'only').map((m) => m.id)).toEqual(['only']);
	});
});
