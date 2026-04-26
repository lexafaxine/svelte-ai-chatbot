import { describe, it, expect } from 'vitest';
import { searchConversations } from './search';
import type { Conversation, Message } from '$lib/types';

function conv(overrides: Partial<Conversation> & { id: string }): Conversation {
	return {
		title: '',
		model: 'm',
		activeChildMap: {},
		createdAt: 0,
		updatedAt: 0,
		...overrides
	};
}

function msg(overrides: Partial<Message> & { id: string; conversationId: string }): Message {
	return {
		parentId: null,
		role: 'user',
		content: '',
		model: 'm',
		createdAt: 0,
		...overrides
	};
}

describe('searchConversations', () => {
	it('returns empty for an empty or whitespace-only query', () => {
		const c = conv({ id: 'c1', title: 'Hello world' });
		expect(searchConversations('', [c], [])).toEqual([]);
		expect(searchConversations('   ', [c], [])).toEqual([]);
	});

	it('matches on conversation title alone and reports no message matches', () => {
		const c = conv({ id: 'c1', title: 'Deploying to Vercel' });
		const results = searchConversations('vercel', [c], []);
		expect(results).toHaveLength(1);
		expect(results[0].conversation.id).toBe('c1');
		expect(results[0].titleMatch).toBe(true);
		expect(results[0].messageSnippets).toEqual([]);
		expect(results[0].totalMessageMatches).toBe(0);
	});

	it('produces a snippet with asymmetric padding so the match stays near the start', () => {
		const c = conv({ id: 'c1', title: 'Untitled' });
		// Filler long enough on both sides to push the match inside the content
		// bounds, so the snippet picks up ellipses on both ends.
		const leftFiller = 'x'.repeat(40);
		const rightFiller = 'x'.repeat(200);
		const content = `${leftFiller} NEEDLE ${rightFiller}`;
		const m = msg({ id: 'm1', conversationId: 'c1', content });
		const results = searchConversations('needle', [c], [m]);
		const snippet = results[0].messageSnippets[0];
		expect(snippet.match).toBe('NEEDLE');
		expect(snippet.before.startsWith('…')).toBe(true);
		expect(snippet.after.endsWith('…')).toBe(true);
		// before pad is 8 chars → "…" + up to 8 chars + match + up to 80 chars + "…"
		// so the before segment is much shorter than the after segment.
		expect(snippet.before.length).toBeLessThan(snippet.after.length);
	});

	it('collects multiple matching messages within one conversation, capped at 3', () => {
		const c = conv({ id: 'c1', title: 't' });
		const messages = [
			msg({ id: 'm1', conversationId: 'c1', content: 'one match here', createdAt: 1 }),
			msg({ id: 'm2', conversationId: 'c1', content: 'two match here', createdAt: 2 }),
			msg({ id: 'm3', conversationId: 'c1', content: 'three match here', createdAt: 3 }),
			msg({ id: 'm4', conversationId: 'c1', content: 'four match here', createdAt: 4 }),
			msg({ id: 'm5', conversationId: 'c1', content: 'five match here', createdAt: 5 })
		];
		const [result] = searchConversations('match', [c], messages);
		expect(result.messageSnippets).toHaveLength(3);
		expect(result.totalMessageMatches).toBe(5);
		// Earliest three by createdAt win the snippet slots.
		expect(result.messageSnippets[0].before).toContain('one');
		expect(result.messageSnippets[1].before).toContain('two');
		expect(result.messageSnippets[2].before).toContain('three');
	});

	it('skips messages that do not match while counting those that do', () => {
		const c = conv({ id: 'c1', title: 't' });
		const messages = [
			msg({ id: 'm1', conversationId: 'c1', content: 'hit one', createdAt: 1 }),
			msg({ id: 'm2', conversationId: 'c1', content: 'nothing', createdAt: 2 }),
			msg({ id: 'm3', conversationId: 'c1', content: 'hit two', createdAt: 3 })
		];
		const [result] = searchConversations('hit', [c], messages);
		expect(result.totalMessageMatches).toBe(2);
		expect(result.messageSnippets).toHaveLength(2);
	});

	it('excludes conversations whose title and messages both miss', () => {
		const a = conv({ id: 'a', title: 'About cats' });
		const b = conv({ id: 'b', title: 'About dogs' });
		const ma = msg({ id: 'ma', conversationId: 'a', content: 'purring is nice' });
		const mb = msg({ id: 'mb', conversationId: 'b', content: 'barking all day' });
		const results = searchConversations('purr', [a, b], [ma, mb]);
		expect(results.map((r) => r.conversation.id)).toEqual(['a']);
	});

	it('sorts results by updatedAt descending', () => {
		const old = conv({ id: 'old', title: 'match', updatedAt: 1 });
		const recent = conv({ id: 'recent', title: 'match', updatedAt: 10 });
		const middle = conv({ id: 'middle', title: 'match', updatedAt: 5 });
		const results = searchConversations('match', [old, middle, recent], []);
		expect(results.map((r) => r.conversation.id)).toEqual(['recent', 'middle', 'old']);
	});

	it('is case-insensitive on both the query and the haystack', () => {
		const c = conv({ id: 'c1', title: 'MixED CaSe TITLE' });
		const m = msg({ id: 'm1', conversationId: 'c1', content: 'UPPERCASE BODY' });
		expect(searchConversations('title', [c], [m])).toHaveLength(1);
		expect(searchConversations('body', [c], [m])[0].messageSnippets[0].match).toBe('BODY');
	});

	it('returns short content without ellipsis padding', () => {
		const c = conv({ id: 'c1', title: 't' });
		const m = msg({ id: 'm1', conversationId: 'c1', content: 'hello world' });
		const [result] = searchConversations('hello', [c], [m]);
		const snippet = result.messageSnippets[0];
		expect(snippet.before).toBe('');
		expect(snippet.match).toBe('hello');
		expect(snippet.after).toBe(' world');
	});
});
