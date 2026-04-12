import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChatMessage from './ChatMessage.svelte';
import type { Message } from '$lib/types';
import { DEFAULT_MODEL } from '$lib/config/models';

function makeMessage(overrides: Partial<Message> = {}): Message {
	return {
		id: 'm1',
		conversationId: 'c1',
		parentId: null,
		role: 'assistant',
		content: '',
		model: DEFAULT_MODEL,
		createdAt: 0,
		...overrides
	};
}

describe('ChatMessage — user role', () => {
	it('renders user content as plain text in a right-aligned bubble', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ role: 'user', content: 'hello **world**' })
		});

		await expect.element(screen.getByText('hello **world**')).toBeVisible();
		// User bubble must NOT run markdown (stars stay literal)
		expect(screen.container.querySelector('strong')).toBeNull();
	});
});

describe('ChatMessage — assistant pending indicator', () => {
	it('shows "Pending…" label when streaming with no content yet', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: '' }),
			isStreaming: true
		});

		await expect.element(screen.getByText(/Pending…/)).toBeVisible();
	});

	it('does not show the pending indicator when content exists', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: 'hi there' }),
			isStreaming: true
		});

		expect(screen.container.textContent).not.toMatch(/Pending…/);
	});

	it('does not show the pending indicator when not streaming', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: '' }),
			isStreaming: false
		});

		expect(screen.container.textContent).not.toMatch(/Pending…/);
	});
});

describe('ChatMessage — assistant content rendering', () => {
	it('renders markdown content as HTML', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: '**bolded**' })
		});

		const strong = screen.container.querySelector('strong');
		expect(strong?.textContent).toBe('bolded');
	});

	it('highlights fenced code blocks', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: '```js\nconst x = 1;\n```' })
		});

		const code = screen.container.querySelector('code.hljs');
		expect(code).not.toBeNull();
		expect(code?.className).toContain('language-js');
	});

	it('shows the streaming caret ▍ only while streaming with content', async () => {
		const streaming = render(ChatMessage, {
			message: makeMessage({ content: 'partial' }),
			isStreaming: true
		});
		expect(streaming.container.textContent).toContain('▍');

		const done = render(ChatMessage, {
			message: makeMessage({ content: 'partial' }),
			isStreaming: false
		});
		expect(done.container.textContent).not.toContain('▍');
	});
});

describe('ChatMessage — reasoning panel', () => {
	it('renders reasoning inside a <details> panel with "Thoughts" label when not streaming', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: 'final answer', reasoning: 'step 1' }),
			isStreaming: false
		});

		const details = screen.container.querySelector('details');
		expect(details).not.toBeNull();
		expect(screen.container.textContent).toContain('Thoughts');
		expect(details?.hasAttribute('open')).toBe(false);
	});

	it('opens the reasoning panel while streaming and no content has arrived yet', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: '', reasoning: 'thinking…' }),
			isStreaming: true
		});

		const details = screen.container.querySelector('details');
		expect(details?.hasAttribute('open')).toBe(true);
		expect(screen.container.textContent).toContain('Thinking…');
	});

	it('closes the reasoning panel once content has started arriving', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: 'answer', reasoning: 'thinking done' }),
			isStreaming: true
		});

		const details = screen.container.querySelector('details');
		expect(details?.hasAttribute('open')).toBe(false);
	});

	it('does not render the reasoning panel when there is no reasoning', async () => {
		const screen = render(ChatMessage, {
			message: makeMessage({ content: 'answer' })
		});

		expect(screen.container.querySelector('details')).toBeNull();
	});
});
