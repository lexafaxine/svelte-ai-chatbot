import { describe, it, expect } from 'vitest';
import { getActivePath, getSiblings, getChainTo } from './message-tree';
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
	it('returns empty array when activeChildMap is empty', () => {
		expect(getActivePath([], 'c1', {})).toEqual([]);
	});

	it('returns empty array when the root entry points to an unknown message', () => {
		const messages = [msg({ id: 'a' })];
		expect(getActivePath(messages, 'c1', { root: 'ghost' })).toEqual([]);
	});

	it('walks down a linear chain and returns root-first order', () => {
		const a = msg({ id: 'a', parentId: null });
		const b = msg({ id: 'b', parentId: 'a' });
		const c = msg({ id: 'c', parentId: 'b' });

		const path = getActivePath([c, a, b], 'c1', { root: 'a', a: 'b', b: 'c' });

		expect(path.map((m) => m.id)).toEqual(['a', 'b', 'c']);
	});

	it('respects the chosen branch at a fork point', () => {
		const u = msg({ id: 'u', parentId: null, role: 'user' });
		const a1 = msg({ id: 'a1', parentId: 'u', role: 'assistant' });
		const a2 = msg({ id: 'a2', parentId: 'u', role: 'assistant' });

		const path = getActivePath([u, a1, a2], 'c1', { root: 'u', u: 'a2' });

		expect(path.map((m) => m.id)).toEqual(['u', 'a2']);
	});

	it('stops when a node has no entry in the map (incomplete descent)', () => {
		const a = msg({ id: 'a', parentId: null });
		const b = msg({ id: 'b', parentId: 'a' });

		const path = getActivePath([a, b], 'c1', { root: 'a' }); // no entry for 'a'
		expect(path.map((m) => m.id)).toEqual(['a']);
	});

	it('ignores messages from other conversations', () => {
		const a = msg({ id: 'a', conversationId: 'c1' });
		const b = msg({ id: 'b', conversationId: 'c2' });

		const path = getActivePath([a, b], 'c1', { root: 'a' });
		expect(path.map((m) => m.id)).toEqual(['a']);
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

describe('getChainTo', () => {
	it('returns empty when messageId is unknown', () => {
		expect(getChainTo([msg({ id: 'a' })], 'c1', 'ghost')).toEqual([]);
	});

	it('walks up via parentId and returns root-first order', () => {
		const a = msg({ id: 'a' });
		const b = msg({ id: 'b', parentId: 'a' });
		const c = msg({ id: 'c', parentId: 'b' });

		expect(getChainTo([c, a, b], 'c1', 'c').map((m) => m.id)).toEqual(['a', 'b', 'c']);
	});

	it('stops at the first message whose parent is missing', () => {
		const orphan = msg({ id: 'o', parentId: 'gone' });
		expect(getChainTo([orphan], 'c1', 'o').map((m) => m.id)).toEqual(['o']);
	});

	it('ignores messages from other conversations', () => {
		const a = msg({ id: 'a', conversationId: 'c1' });
		const b = msg({ id: 'b', conversationId: 'c2', parentId: 'a' });

		expect(getChainTo([a, b], 'c2', 'b').map((m) => m.id)).toEqual(['b']);
	});
});
