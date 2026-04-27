import { describe, it, expect } from 'vitest';
import { buildFork } from './fork';
import type { Conversation, Message } from '$lib/types';

function conv(overrides: Partial<Conversation> & { id: string }): Conversation {
	return {
		title: 'Source',
		model: 'm',
		activeChildMap: {},
		createdAt: 0,
		updatedAt: 0,
		...overrides
	};
}

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

describe('buildFork', () => {
	it('returns null when atMessageId is unknown', () => {
		const result = buildFork({
			source: conv({ id: 'c1' }),
			sourceMessages: [msg({ id: 'a' })],
			atMessageId: 'ghost',
			mode: 'active-path'
		});
		expect(result).toBeNull();
	});

	it('active-path mode clones only the chain root → atMessageId', () => {
		// a → b1 (target) ; b2 (sibling, off-path)
		const a = msg({ id: 'a', createdAt: 1 });
		const b1 = msg({ id: 'b1', parentId: 'a', createdAt: 2 });
		const b2 = msg({ id: 'b2', parentId: 'a', createdAt: 3 });

		const result = buildFork({
			source: conv({ id: 'c1' }),
			sourceMessages: [a, b1, b2],
			atMessageId: 'b1',
			mode: 'active-path'
		})!;

		expect(result.messages).toHaveLength(2);
		expect(result.messages.some((m) => m.createdAt === 3)).toBe(false);

		// activeChildMap encodes the descent root → cloneA → cloneB1.
		const cloneA = result.messages.find((m) => m.createdAt === 1)!;
		const cloneB1 = result.messages.find((m) => m.createdAt === 2)!;
		expect(result.conversation.activeChildMap).toEqual({
			root: cloneA.id,
			[cloneA.id]: cloneB1.id
		});
	});

	it('full-history mode clones every message at or before atMessageId', () => {
		const a = msg({ id: 'a', createdAt: 1 });
		const b1 = msg({ id: 'b1', parentId: 'a', createdAt: 2 });
		const b2 = msg({ id: 'b2', parentId: 'a', createdAt: 3 });
		const c = msg({ id: 'c', parentId: 'b2', createdAt: 4 });

		const result = buildFork({
			source: conv({ id: 'c1' }),
			sourceMessages: [a, b1, b2, c],
			atMessageId: 'b2',
			mode: 'full-history'
		})!;

		expect(result.messages).toHaveLength(3);
		expect(result.messages.some((m) => m.createdAt === 4)).toBe(false);
	});

	it('rewrites parentId through the id map and titles the new conversation', () => {
		const a = msg({ id: 'a', createdAt: 1 });
		const b = msg({ id: 'b', parentId: 'a', createdAt: 2 });

		const result = buildFork({
			source: conv({ id: 'c1', title: 'My chat' }),
			sourceMessages: [a, b],
			atMessageId: 'b',
			mode: 'active-path'
		})!;

		const cloneA = result.messages.find((m) => m.createdAt === 1)!;
		const cloneB = result.messages.find((m) => m.createdAt === 2)!;

		expect(cloneA.id).not.toBe('a');
		expect(cloneB.parentId).toBe(cloneA.id);
		expect(result.conversation.title).toBe('Fork of My chat');
	});
});
