import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { Conversation } from '$lib/types';

const chatMock = vi.hoisted(() => ({ conversations: [] as Conversation[] }));
const themeMock = vi.hoisted(() => ({ current: 'light' as 'light' | 'dark', toggle: vi.fn() }));
const pageMock = vi.hoisted(() => ({ params: {} as Record<string, string | undefined> }));

vi.mock('$lib/stores/chatStore.svelte', () => ({
	get chat() {
		return chatMock;
	}
}));

vi.mock('$lib/stores/theme.svelte', () => ({
	get theme() {
		return themeMock;
	}
}));

vi.mock('$app/state', () => ({
	get page() {
		return pageMock;
	}
}));

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

// import after mocks are set up
const { default: Sidebar } = await import('./Sidebar.svelte');

beforeEach(() => {
	chatMock.conversations = [];
	themeMock.current = 'light';
	themeMock.toggle.mockReset();
	pageMock.params = {};
});

describe('Sidebar — conversation list', () => {
	it('shows empty state when there are no conversations', async () => {
		const screen = render(Sidebar);
		await expect.element(screen.getByText('No conversations yet')).toBeVisible();
	});

	it('renders conversations sorted by updatedAt descending', async () => {
		chatMock.conversations = [
			conv({ id: 'a', title: 'Older', updatedAt: 100 }),
			conv({ id: 'b', title: 'Newest', updatedAt: 300 }),
			conv({ id: 'c', title: 'Middle', updatedAt: 200 })
		];

		const screen = render(Sidebar);
		const titles = Array.from(screen.container.querySelectorAll('nav li')).map((li) =>
			li.textContent?.trim()
		);

		expect(titles).toEqual(['Newest', 'Middle', 'Older']);
	});

	it('links each conversation to its chat route', async () => {
		chatMock.conversations = [conv({ id: 'abc', title: 'Hello', updatedAt: 1 })];
		const screen = render(Sidebar);

		const link = screen.container.querySelector('nav a[href="/chat/abc"]');
		expect(link).not.toBeNull();
	});

	it('"New chat" button links to root', async () => {
		const screen = render(Sidebar);
		const newChat = screen.container.querySelector('a[href="/"]');
		expect(newChat?.textContent).toContain('New chat');
	});
});

describe('Sidebar — theme toggle', () => {
	it('shows "Dark mode" label when current theme is light', async () => {
		themeMock.current = 'light';
		const screen = render(Sidebar);
		await expect.element(screen.getByText('Dark mode')).toBeVisible();
	});

	it('shows "Light mode" label when current theme is dark', async () => {
		themeMock.current = 'dark';
		const screen = render(Sidebar);
		await expect.element(screen.getByText('Light mode')).toBeVisible();
	});

	it('invokes theme.toggle() when clicked', async () => {
		const screen = render(Sidebar);
		await screen.getByRole('button', { name: /Dark mode/ }).click();
		expect(themeMock.toggle).toHaveBeenCalledOnce();
	});
});
