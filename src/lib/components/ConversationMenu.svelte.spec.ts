import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';

const gotoMock = vi.hoisted(() => vi.fn());
const resolveMock = vi.hoisted(() => vi.fn((path: string) => path));
const pageMock = vi.hoisted(() => ({ params: {} as Record<string, string | undefined> }));
const chatMock = vi.hoisted(() => ({
	deleteConversation: vi.fn(),
	setConversationTitle: vi.fn()
}));

vi.mock('$app/navigation', () => ({
	goto: gotoMock
}));

vi.mock('$app/paths', () => ({
	resolve: resolveMock
}));

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

// import after mocks are set up
const { default: ConversationMenu } = await import('./ConversationMenu.svelte');

beforeEach(() => {
	gotoMock.mockReset();
	resolveMock.mockClear();
	chatMock.deleteConversation.mockReset();
	chatMock.setConversationTitle.mockReset();
	pageMock.params = {};
});

describe('ConversationMenu', () => {
	const mockConversation = {
		id: 'conv-123',
		title: 'Test Conversation',
		model: 'default',
		tailId: null,
		activeChildMap: {},
		createdAt: 1000,
		updatedAt: 1000
	};

	it('opens the dropdown and clicking delete shows the dialog', async () => {
		const screen = render(ConversationMenu, {
			conversation: mockConversation
		});

		// Open the dropdown
		await screen.getByRole('button', { name: 'Conversation actions' }).click();

		// Click the delete menu item
		await screen.getByRole('menuitem', { name: /Delete/i }).click();

		// Verify that the dialog is open with the expected text
		await expect.element(screen.getByRole('dialog')).toBeVisible();
		await expect.element(screen.getByText('Delete conversation?')).toBeVisible();
		await expect.element(screen.getByText(/Test Conversation/)).toBeVisible();
	});

	it('deletes conversation and redirects if it is the active conversation', async () => {
		// Set the current page params to match the conversation ID
		pageMock.params = { conversationId: 'conv-123' };

		const screen = render(ConversationMenu, {
			conversation: mockConversation
		});

		// Open dropdown -> Click menu item -> Confirm delete
		await screen.getByRole('button', { name: 'Conversation actions' }).click();
		await screen.getByRole('menuitem', { name: /Delete/i }).click();
		await screen.getByRole('button', { name: 'Delete', exact: true }).click();

		// Verify outcomes
		expect(chatMock.deleteConversation).toHaveBeenCalledWith('conv-123');
		expect(gotoMock).toHaveBeenCalledOnce();
	});

	it('deletes conversation without redirecting if it is not the active conversation', async () => {
		// Set the current page params to something else
		pageMock.params = { conversationId: 'conv-456' };

		const screen = render(ConversationMenu, {
			conversation: mockConversation
		});

		// Open dropdown -> Click menu item -> Confirm delete
		await screen.getByRole('button', { name: 'Conversation actions' }).click();
		await screen.getByRole('menuitem', { name: /Delete/i }).click();
		await screen.getByRole('button', { name: 'Delete', exact: true }).click();

		// Verify outcomes
		expect(chatMock.deleteConversation).toHaveBeenCalledWith('conv-123');
		expect(gotoMock).not.toHaveBeenCalled();
	});

	it('opens the rename dialog pre-filled with the current title', async () => {
		const screen = render(ConversationMenu, { conversation: mockConversation });

		await screen.getByRole('button', { name: 'Conversation actions' }).click();
		await screen.getByRole('menuitem', { name: /Rename/i }).click();

		await expect.element(screen.getByRole('dialog')).toBeVisible();
		await expect.element(screen.getByText('Rename conversation')).toBeVisible();
		await expect.element(screen.getByRole('textbox')).toHaveValue('Test Conversation');
	});

	it('saves a new title via setConversationTitle and closes the dialog', async () => {
		const screen = render(ConversationMenu, { conversation: mockConversation });

		await screen.getByRole('button', { name: 'Conversation actions' }).click();
		await screen.getByRole('menuitem', { name: /Rename/i }).click();

		const input = screen.getByRole('textbox');
		await input.fill('  Renamed chat  ');
		await screen.getByRole('button', { name: 'Save', exact: true }).click();

		expect(chatMock.setConversationTitle).toHaveBeenCalledExactlyOnceWith(
			'conv-123',
			'Renamed chat'
		);
	});

	it('disables Save when the input is empty or unchanged', async () => {
		const screen = render(ConversationMenu, { conversation: mockConversation });

		await screen.getByRole('button', { name: 'Conversation actions' }).click();
		await screen.getByRole('menuitem', { name: /Rename/i }).click();

		const save = screen.getByRole('button', { name: 'Save', exact: true });
		const input = screen.getByRole('textbox');

		// Pre-filled with current title → unchanged → disabled
		await expect.element(save).toBeDisabled();

		// Empty → still disabled
		await input.fill('');
		await expect.element(save).toBeDisabled();

		// Whitespace only → still disabled
		await input.fill('   ');
		await expect.element(save).toBeDisabled();

		// Different value → enabled
		await input.fill('Something else');
		await expect.element(save).toBeEnabled();
	});

	it('cancel closes the rename dialog without calling setConversationTitle', async () => {
		const screen = render(ConversationMenu, { conversation: mockConversation });

		await screen.getByRole('button', { name: 'Conversation actions' }).click();
		await screen.getByRole('menuitem', { name: /Rename/i }).click();

		await screen.getByRole('textbox').fill('Something else');
		await screen.getByRole('button', { name: 'Cancel' }).click();

		expect(chatMock.setConversationTitle).not.toHaveBeenCalled();
	});
});
