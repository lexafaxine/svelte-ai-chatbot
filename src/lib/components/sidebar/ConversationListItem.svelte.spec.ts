import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Conversation } from '$lib/types';
import type { Snippet } from '$lib/utils/search';

const pageMock = vi.hoisted(() => ({ params: {} as Record<string, string | undefined> }));
const chatMock = vi.hoisted(() => ({
	deleteConversation: vi.fn(),
	setConversationTitle: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$app/state', () => ({
	get page() {
		return pageMock;
	}
}));
vi.mock('$lib/stores/chatStore.svelte', () => ({
	get chat() {
		return chatMock;
	}
}));

const { default: ConversationListItem } = await import('./ConversationListItem.svelte');

function conv(overrides: Partial<Conversation> & { id: string }): Conversation {
	return {
		title: 'Untitled',
		model: 'm',
		tailId: null,
		activeChildMap: {},
		createdAt: 0,
		updatedAt: 0,
		...overrides
	};
}

function snippet(overrides: Partial<Snippet> = {}): Snippet {
	return { before: '', match: '', after: '', ...overrides };
}

beforeEach(() => {
	pageMock.params = {};
	chatMock.deleteConversation.mockReset();
	chatMock.setConversationTitle.mockReset();
});

describe('ConversationListItem — normal mode', () => {
	it('renders the title and links to the chat route', async () => {
		const conversation = conv({ id: 'abc', title: 'Hello world' });
		const screen = render(ConversationListItem, { conversation, isActive: false });

		await expect.element(screen.getByText('Hello world')).toBeVisible();
		const link = screen.container.querySelector('a[href="/chat/abc"]');
		expect(link).not.toBeNull();
	});

	it('does not render any snippet lines when snippets is undefined', () => {
		const conversation = conv({ id: 'abc', title: 'Plain' });
		const screen = render(ConversationListItem, { conversation, isActive: false });

		// No "+N more" hint in normal mode
		expect(screen.container.textContent).not.toMatch(/more/);
	});
});

describe('ConversationListItem — search-result mode', () => {
	it('renders each snippet with the match wrapped in a bold span', async () => {
		const conversation = conv({ id: 'abc', title: 'Chat about cats' });
		const snippets = [
			snippet({ before: 'I love ', match: 'cats', after: ' so much' }),
			snippet({ before: 'more ', match: 'cats', after: ' please' })
		];
		const screen = render(ConversationListItem, {
			conversation,
			isActive: false,
			snippets,
			totalMatches: 2
		});

		// Title still visible
		await expect.element(screen.getByText('Chat about cats')).toBeVisible();

		// The match text appears inside a bolded span, one per snippet.
		const bolds = Array.from(
			screen.container.querySelectorAll('span.font-semibold')
		) as HTMLElement[];
		expect(bolds.length).toBeGreaterThanOrEqual(2);
		expect(bolds.slice(0, 2).every((el) => el.textContent === 'cats')).toBe(true);

		// Surrounding text is rendered too.
		expect(screen.container.textContent).toContain('I love ');
		expect(screen.container.textContent).toContain(' so much');
		expect(screen.container.textContent).toContain('more ');
	});

	it('shows "+N more" only when totalMatches exceeds rendered snippets', () => {
		const conversation = conv({ id: 'abc', title: 't' });
		const snippets = [snippet({ match: 'x' }), snippet({ match: 'x' }), snippet({ match: 'x' })];

		const exact = render(ConversationListItem, {
			conversation,
			isActive: false,
			snippets,
			totalMatches: 3
		});
		expect(exact.container.textContent).not.toMatch(/more/);
		exact.unmount();

		const overflow = render(ConversationListItem, {
			conversation,
			isActive: false,
			snippets,
			totalMatches: 7
		});
		expect(overflow.container.textContent).toMatch(/\+4 more/);
	});

	it('renders the title alone when snippets is an empty array (title-only match)', () => {
		const conversation = conv({ id: 'abc', title: 'Deployment notes' });
		const screen = render(ConversationListItem, {
			conversation,
			isActive: false,
			snippets: [],
			totalMatches: 0
		});

		expect(screen.container.textContent).toContain('Deployment notes');
		expect(screen.container.querySelectorAll('span.font-semibold').length).toBe(0);
		expect(screen.container.textContent).not.toMatch(/more/);
	});
});
