import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChatInput from './ChatInput.svelte';

describe('ChatInput — submission', () => {
	it('submits trimmed content via Send button and clears the textarea', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textbox = screen.getByRole('textbox');

		await textbox.fill('  hello  ');
		await screen.getByRole('button', { name: 'Send' }).click();

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith('hello');
		await expect.element(textbox).toHaveValue('');
	});

	it('submits on Enter without shift', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textbox = screen.getByRole('textbox');

		await textbox.fill('hi');
		textbox.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onSubmit).toHaveBeenCalledExactlyOnceWith('hi');
	});

	it('does NOT submit on Shift+Enter (lets newline through)', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textbox = screen.getByRole('textbox');

		await textbox.fill('line1');
		textbox
			.element()
			.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does NOT submit while IME composition is active', async () => {
		// `isComposing` is read off the KeyboardEvent itself and the locator
		// keyboard API doesn't expose it, so we dispatch a raw KeyboardEvent
		// on the underlying element here.
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textbox = screen.getByRole('textbox');

		await textbox.fill('ニホンゴ');
		textbox
			.element()
			.dispatchEvent(
				new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })
			);

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it('does not submit when the textarea is blank or whitespace-only', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit });
		const textbox = screen.getByRole('textbox');

		await textbox.fill('   ');
		textbox.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onSubmit).not.toHaveBeenCalled();
	});
});

describe('ChatInput — send button disabled state', () => {
	it('is disabled when textarea is empty', async () => {
		const screen = render(ChatInput, { onSubmit: vi.fn() });
		await expect.element(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
	});

	it('enables once non-empty content is present', async () => {
		const screen = render(ChatInput, { onSubmit: vi.fn() });
		await screen.getByRole('textbox').fill('hi');
		await expect.element(screen.getByRole('button', { name: 'Send' })).toBeEnabled();
	});
});

describe('ChatInput — streaming state', () => {
	it('shows the Stop button instead of Send while streaming', async () => {
		const onStop = vi.fn();
		const screen = render(ChatInput, { onSubmit: vi.fn(), onStop, isStreaming: true });

		await expect.element(screen.getByRole('button', { name: 'Stop' })).toBeVisible();
		await screen.getByRole('button', { name: 'Stop' }).click();
		expect(onStop).toHaveBeenCalledOnce();
	});

	it('does not submit when the user hits Enter while streaming', async () => {
		const onSubmit = vi.fn();
		const screen = render(ChatInput, { onSubmit, isStreaming: true });
		const textbox = screen.getByRole('textbox');

		await textbox.fill('late message');
		textbox.element().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

		expect(onSubmit).not.toHaveBeenCalled();
	});
});
