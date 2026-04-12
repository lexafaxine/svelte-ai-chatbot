<script lang="ts">
	import { Textarea } from '$lib/components/ui/textarea';
	import { Button } from '$lib/components/ui/button';
	import SendIcon from '@lucide/svelte/icons/send';
	import SquareIcon from '@lucide/svelte/icons/square';

	interface Props {
		onSubmit: (content: string) => void;
		onStop?: () => void;
		isStreaming?: boolean;
		disabled?: boolean;
		placeholder?: string;
	}

	let {
		onSubmit,
		onStop,
		isStreaming = false,
		disabled = false,
		placeholder = 'Send a message...'
	}: Props = $props();

	let value = $state('');

	function handleSubmit() {
		const trimmed = value.trim();
		if (!trimmed || disabled || isStreaming) return;
		onSubmit(trimmed);
		value = '';
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
			event.preventDefault();
			handleSubmit();
		}
	}
</script>

<form
	class="flex items-end gap-2 p-4"
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
>
	<Textarea
		bind:value
		onkeydown={handleKeyDown}
		{placeholder}
		{disabled}
		rows={1}
		class="max-h-48 min-h-10 resize-none"
	/>
	{#if isStreaming}
		<Button type="button" variant="secondary" size="icon" onclick={onStop} aria-label="Stop">
			<SquareIcon />
		</Button>
	{:else}
		<Button type="submit" size="icon" disabled={disabled || !value.trim()} aria-label="Send">
			<SendIcon />
		</Button>
	{/if}
</form>
