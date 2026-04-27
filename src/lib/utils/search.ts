import type { Conversation, Message } from '$lib/types';

export interface Snippet {
	before: string;
	match: string;
	after: string;
}

export interface SearchResult {
	conversation: Conversation;
	titleMatch: boolean;
	messageSnippets: Snippet[];
	totalMessageMatches: number;
}

// to make sure the match snippet visible in search result
const SNIPPET_BEFORE_PAD = 8;
const SNIPPET_AFTER_PAD = 80;
const MAX_SNIPPETS_PER_CONV = 3;

function makeSnippet(content: string, matchStart: number, matchLen: number): Snippet {
	const matchEnd = matchStart + matchLen;
	const start = Math.max(0, matchStart - SNIPPET_BEFORE_PAD);
	const end = Math.min(content.length, matchEnd + SNIPPET_AFTER_PAD);

	const prefix = start > 0 ? '…' : '';
	const suffix = end < content.length ? '…' : '';

	return {
		before: prefix + content.slice(start, matchStart),
		match: content.slice(matchStart, matchEnd),
		after: content.slice(matchEnd, end) + suffix
	};
}

/**
 * Case-insensitive substring search over conversation titles and message
 * contents. Returns one entry per matching conversation, sorted by
 * `updatedAt` descending. Collects up to `MAX_SNIPPETS_PER_CONV` snippets
 * (earliest first) and reports the full match count so the UI can render
 * a "+N more" hint.
 *
 * @param query — raw search string; trimmed and lower-cased internally.
 * @param conversations — full list of conversations to search.
 * @param messages — full message set (all conversations).
 * @returns matching conversations with title-match flag and message snippets,
 *   or an empty array when `query` is blank.
 */
export function searchConversations(
	query: string,
	conversations: Conversation[],
	messages: Message[]
): SearchResult[] {
	const q = query.trim().toLowerCase();
	if (!q) return [];

	const messagesByConv = new Map<string, Message[]>();
	for (const m of messages) {
		const list = messagesByConv.get(m.conversationId);
		if (list) list.push(m);
		else messagesByConv.set(m.conversationId, [m]);
	}
	for (const list of messagesByConv.values()) {
		list.sort((a, b) => a.createdAt - b.createdAt);
	}

	const results: SearchResult[] = [];

	for (const conv of conversations) {
		const titleMatch = conv.title.toLowerCase().includes(q);

		const snippets: Snippet[] = [];
		let totalMessageMatches = 0;
		const convMessages = messagesByConv.get(conv.id) ?? [];
		for (const m of convMessages) {
			const idx = m.content.toLowerCase().indexOf(q);
			if (idx === -1) continue;
			totalMessageMatches++;
			if (snippets.length < MAX_SNIPPETS_PER_CONV) {
				snippets.push(makeSnippet(m.content, idx, q.length));
			}
		}

		if (titleMatch || totalMessageMatches > 0) {
			results.push({
				conversation: conv,
				titleMatch,
				messageSnippets: snippets,
				totalMessageMatches
			});
		}
	}

	results.sort((a, b) => b.conversation.updatedAt - a.conversation.updatedAt);
	return results;
}
