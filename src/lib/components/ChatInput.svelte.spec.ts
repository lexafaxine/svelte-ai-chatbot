import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChatInput from './ChatInput.svelte';

function findTextarea(container: ParentNode): HTMLTextAreaElement {
	const el = container.querySelector('textarea');
	if (!el) throw new Error('textarea not found');
	return el;
}

describe('ChatInput — submission', () => {
	it('submits trimmed content via Send button and clears the textarea', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textarea = findTextarea(screen.container);

		textarea.value = '  hello  ';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));

		await screen.getByRole('button', { name: 'Send' }).click();

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith('hello');
		expect(textarea.value).toBe('');
	});

	it('submits on Enter without shift', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textarea = findTextarea(screen.container);

		textarea.value = 'hi';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith('hi');
	});

	it('does NOT submit on Shift+Enter (lets newline through)', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textarea = findTextarea(screen.container);

		textarea.value = 'line1';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		textarea.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true })
		);

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does NOT submit while IME composition is active', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textarea = findTextarea(screen.container);

		textarea.value = 'ニホンゴ';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		textarea.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
		);

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does not submit when the textarea is blank or whitespace-only', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textarea = findTextarea(screen.container);

		textarea.value = '   ';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onSubmit).not.toHaveBeenCalled();
	});
});

describe('ChatInput — send button disabled state', () => {
	it('is disabled when textarea is empty', async () => {
		const screen = render(ChatInput, { onSubmit: vi.fn() });
		const sendBtn = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Send"]')!;
		expect(sendBtn.disabled).toBe(true);
	});

	it('enables once non-empty content is present', async () => {
		const screen = render(ChatInput, { onSubmit: vi.fn() });
		const textarea = findTextarea(screen.container);
		textarea.value = 'hi';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));

		const sendBtn = screen.container.querySelector<HTMLButtonElement>('button[aria-label="Send"]')!;
		await vi.waitFor(() => expect(sendBtn.disabled).toBe(false));
	});
});

describe('ChatInput — streaming state', () => {
	it('shows the Stop button instead of Send while streaming', async () => {
		const onStop = vi.fn();
		const screen = render(ChatInput, { onSubmit: vi.fn(), onStop, isStreaming: true });

		expect(screen.container.querySelector('button[aria-label="Send"]')).toBeNull();
		await screen.getByRole('button', { name: 'Stop' }).click();
		expect(onStop).toHaveBeenCalledOnce();
	});

	it('does not submit when the user hits Enter while streaming', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit, isStreaming: true });
		const textarea = findTextarea(screen.container);

		textarea.value = 'late message';
		textarea.dispatchEvent(new Event('input', { bubbles: true }));
		textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onSubmit).not.toHaveBeenCalled();
	});
});
