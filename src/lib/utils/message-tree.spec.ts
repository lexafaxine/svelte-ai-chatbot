import { describe, it, expect } from 'vitest';
import { getActivePath, getSiblings, getLeafDescendant } from './message-tree';
import type { Message } from '$lib/types';

function msg(overrides: Partial<Message> & { id: string }): Message {
	return {
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

describe('getLeafDescendant', () => {
	it('returns startId when it has no children', () => {
		const a = msg({ id: 'a' });
		const map: Record<string, string> = {};
		expect(getLeafDescendant([a], 'a', map)).toBe('a');
	});

	it('follows activeChildMap down to the leaf', () => {
		const a = msg({ id: 'a' });
		const b = msg({ id: 'b', parentId: 'a', createdAt: 1 });
		const c = msg({ id: 'c', parentId: 'b', createdAt: 2 });
		const map: Record<string, string> = { a: 'b', b: 'c' };

		expect(getLeafDescendant([a, b, c], 'a', map)).toBe('c');
	});

	it('picks the latest child and records it when map has no entry', () => {
		const a = msg({ id: 'a' });
		const b1 = msg({ id: 'b1', parentId: 'a', createdAt: 1 });
		const b2 = msg({ id: 'b2', parentId: 'a', createdAt: 5 });
		const map: Record<string, string> = {};

		expect(getLeafDescendant([a, b1, b2], 'a', map)).toBe('b2');
		expect(map['a']).toBe('b2');
	});

	it('falls back to latest child when mapped child no longer exists', () => {
		const a = msg({ id: 'a' });
		const b = msg({ id: 'b', parentId: 'a', createdAt: 1 });
		const map: Record<string, string> = { a: 'deleted' };

		expect(getLeafDescendant([a, b], 'a', map)).toBe('b');
		expect(map['a']).toBe('b');
	});

	it('walks through a branched tree respecting the map at each level', () => {
		//   a
		//  / \
		// b1  b2
		//     |
		//    c1
		const a = msg({ id: 'a' });
		const b1 = msg({ id: 'b1', parentId: 'a', createdAt: 1 });
		const b2 = msg({ id: 'b2', parentId: 'a', createdAt: 2 });
		const c1 = msg({ id: 'c1', parentId: 'b2', createdAt: 3 });
		const map: Record<string, string> = { a: 'b2' };

		expect(getLeafDescendant([a, b1, b2, c1], 'a', map)).toBe('c1');
		expect(map['b2']).toBe('c1');
	});
});
