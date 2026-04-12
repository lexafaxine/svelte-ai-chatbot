import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ModelSwitcher from './ModelSwitcher.svelte';
import { MODELS } from '$lib/config/models';

describe('ModelSwitcher — display', () => {
	it('shows the current model label', async () => {
		const model = MODELS[0];
		const screen = render(ModelSwitcher, { model: model.id, onModelChange: vi.fn() });
		await expect.element(screen.getByText(model.label)).toBeVisible();
	});

	it('shows the model id as fallback label for unknown models', async () => {
		const screen = render(ModelSwitcher, {
			model: 'unknown/model-id',
			onModelChange: vi.fn()
		});
		await expect.element(screen.getByText('unknown/model-id')).toBeVisible();
	});
});

describe('ModelSwitcher — dropdown interaction', () => {
	it('opens dropdown and shows all models on trigger click', async () => {
		const screen = render(ModelSwitcher, { model: MODELS[0].id, onModelChange: vi.fn() });

		// click the trigger to open dropdown
		await screen.getByText(MODELS[0].label).click();

		// all model labels should be visible in the dropdown
		for (const m of MODELS) {
			await expect.element(screen.getByText(m.id)).toBeVisible();
		}
	});

	it('calls onModelChange when selecting a different model', async () => {
		const onModelChange = vi.fn();
		const screen = render(ModelSwitcher, { model: MODELS[0].id, onModelChange });

		await screen.getByText(MODELS[0].label).click();

		// click the second model's label
		await screen.getByText(MODELS[1].label).click();

		expect(onModelChange).toHaveBeenCalledExactlyOnceWith(MODELS[1].id);
	});
});
