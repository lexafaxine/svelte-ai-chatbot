<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import { loadApiKey, saveApiKey } from '$lib/stores/persistence';

	interface Props {
		open: boolean;
	}

	let { open = $bindable() }: Props = $props();

	let apiKeyInput = $state('');

	$effect(() => {
		if (open) apiKeyInput = loadApiKey() ?? '';
	});

	function handleSave() {
		const trimmed = apiKeyInput.trim();
		saveApiKey(trimmed || null);
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Settings</Dialog.Title>
			<Dialog.Description>
				Enter your OpenRouter API key to use your own account. You can get one at
				openrouter.ai/keys. The key is stored locally in your browser and sent directly to
				OpenRouter — it never touches our server.
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-3 py-2">
			<label for="api-key-input" class="text-sm font-medium">OpenRouter API Key</label>
			<Input id="api-key-input" type="password" placeholder="sk-or-..." bind:value={apiKeyInput} />
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSave}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
