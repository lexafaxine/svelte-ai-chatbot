import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ConversationTree from './ConversationTree.svelte';
import type { Message, Conversation } from '$lib/types';

function msg(
	overrides: Partial<Message> & { id: string; role: Message['role']; content: string }
): Message {
	return {
		conversationId: 'conv-1',
		parentId: null,
		model: 'test-model',
		createdAt: 0,
		...overrides
	};
}

function conv(overrides?: Partial<Conversation>): Conversation {
	return {
		id: 'conv-1',
		title: 'Test',
		model: 'test-model',
		tailId: null,
		activeChildMap: {},
		createdAt: 0,
		updatedAt: 0,
		...overrides
	};
}

// Linear chain: U1 → A1 → U2 → A2
const linearMessages: Message[] = [
	msg({ id: 'u1', role: 'user', content: 'Hello', parentId: null, createdAt: 1 }),
	msg({ id: 'a1', role: 'assistant', content: 'Hi there', parentId: 'u1', createdAt: 2 }),
	msg({ id: 'u2', role: 'user', content: 'How are you', parentId: 'a1', createdAt: 3 }),
	msg({ id: 'a2', role: 'assistant', content: 'I am fine', parentId: 'u2', createdAt: 4 })
];

// Forked tree:
//   U1 → A1 → U2 (fork point)
//              ├── A2a (branch a)
//              └── A2b (branch b)
const forkedMessages: Message[] = [
	msg({ id: 'u1', role: 'user', content: 'Hello', parentId: null, createdAt: 1 }),
	msg({ id: 'a1', role: 'assistant', content: 'Hi there', parentId: 'u1', createdAt: 2 }),
	msg({ id: 'u2', role: 'user', content: 'Question', parentId: 'a1', createdAt: 3 }),
	msg({ id: 'a2a', role: 'assistant', content: 'Answer A', parentId: 'u2', createdAt: 4 }),
	msg({ id: 'a2b', role: 'assistant', content: 'Answer B', parentId: 'u2', createdAt: 5 })
];

async function openDialog(screen: ReturnType<typeof render>) {
	await screen.getByLabelText('Show conversation tree').click();
	await expect.element(screen.getByText('Conversation Tree')).toBeVisible();
}

describe('ConversationTree — trigger button', () => {
	it('shows the tree button with label', async () => {
		const screen = render(ConversationTree, {
			conversation: conv({ tailId: 'a2' }),
			messages: linearMessages,
			onSelectPath: vi.fn()
		});
		await expect.element(screen.getByLabelText('Show conversation tree')).toBeVisible();
		await expect.element(screen.getByText('Switch conversation path')).toBeVisible();
	});
});

describe('ConversationTree — empty state', () => {
	it('shows "No messages yet" for empty conversations', async () => {
		const screen = render(ConversationTree, {
			conversation: conv(),
			messages: [],
			onSelectPath: vi.fn()
		});
		await openDialog(screen);
		await expect.element(screen.getByText('No messages yet')).toBeVisible();
	});
});

describe('ConversationTree — linear chain rendering', () => {
	it('renders a linear conversation as a single compressed chain with → separators', async () => {
		const screen = render(ConversationTree, {
			conversation: conv({ tailId: 'a2' }),
			messages: linearMessages,
			onSelectPath: vi.fn()
		});
		await openDialog(screen);

		// all messages should appear in the dialog
		await expect.element(screen.getByText('Hello')).toBeVisible();
		await expect.element(screen.getByText('Hi there')).toBeVisible();
		await expect.element(screen.getByText('How are you')).toBeVisible();
		await expect.element(screen.getByText('I am fine')).toBeVisible();

		// → separators indicate chain compression (rendered in portal, query document)
		await expect.element(screen.getByText('→').first()).toBeVisible();
	});

	it('does not show collapse chevrons for a linear chain (no forks)', async () => {
		const screen = render(ConversationTree, {
			conversation: conv({ tailId: 'a2' }),
			messages: linearMessages,
			onSelectPath: vi.fn()
		});
		await openDialog(screen);

		const expandBtns = document.querySelectorAll('button[aria-label="Expand"]');
		const collapseBtns = document.querySelectorAll('button[aria-label="Collapse"]');
		expect(expandBtns.length + collapseBtns.length).toBe(0);
	});
});

describe('ConversationTree — forked tree rendering', () => {
	it('renders fork children as separate chains', async () => {
		const screen = render(ConversationTree, {
			conversation: conv({ tailId: 'a2a' }),
			messages: forkedMessages,
			onSelectPath: vi.fn()
		});
		await openDialog(screen);

		await expect.element(screen.getByText('Answer A')).toBeVisible();
		await expect.element(screen.getByText('Answer B')).toBeVisible();
	});

	it('shows a collapse chevron at the fork point', async () => {
		const screen = render(ConversationTree, {
			conversation: conv({ tailId: 'a2a' }),
			messages: forkedMessages,
			onSelectPath: vi.fn()
		});
		await openDialog(screen);

		const collapseBtn = document.querySelector('button[aria-label="Collapse"]');
		expect(collapseBtn).not.toBeNull();
	});

	it('clicking collapse hides fork children, clicking expand shows them', async () => {
		const screen = render(ConversationTree, {
			conversation: conv({ tailId: 'a2a' }),
			messages: forkedMessages,
			onSelectPath: vi.fn()
		});
		await openDialog(screen);

		// both branches visible initially
		await expect.element(screen.getByText('Answer A')).toBeVisible();
		await expect.element(screen.getByText('Answer B')).toBeVisible();

		// collapse — use the vitest-browser locator so it waits for the click to process
		await screen.getByLabelText('Collapse').click();

		// children should be hidden after collapse
		await vi.waitFor(() => {
			const portal = document.querySelector('[data-slot="dialog-content"]')!;
			expect(portal.textContent).not.toContain('Answer A');
			expect(portal.textContent).not.toContain('Answer B');
		});

		// expand
		await screen.getByLabelText('Expand').click();

		await expect.element(screen.getByText('Answer A')).toBeVisible();
		await expect.element(screen.getByText('Answer B')).toBeVisible();
	});
});

describe('ConversationTree — leaf click navigation', () => {
	it('calls onSelectPath when clicking a leaf chain', async () => {
		const onSelectPath = vi.fn();
		const screen = render(ConversationTree, {
			conversation: conv({ tailId: 'a2a' }),
			messages: forkedMessages,
			onSelectPath
		});
		await openDialog(screen);

		// click the "Answer B" leaf chain
		await screen.getByText('Answer B').click();

		expect(onSelectPath).toHaveBeenCalledOnce();
		// should be called with the leaf id 'a2b'
		expect(onSelectPath).toHaveBeenCalledWith('a2b');
	});
});
