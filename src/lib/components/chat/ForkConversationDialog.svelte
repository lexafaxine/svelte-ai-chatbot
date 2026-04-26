<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { ForkMode } from '$lib/utils/fork';

	interface Props {
		open: boolean;
		defaultTitle: string;
		onConfirm: (opts: { title: string; mode: ForkMode }) => void;
	}

	let { open = $bindable(), defaultTitle, onConfirm }: Props = $props();

	// the form is only rendered while `open` is true.
	let title = $state('');
	let mode = $state<ForkMode>('active-path');

	// Reset the form whenever the dialog (re-)opens.
	$effect(() => {
		if (open) {
			title = defaultTitle;
			mode = 'active-path';
		}
	});

	function handleConfirm() {
		const trimmed = title.trim();
		if (!trimmed) return;
		onConfirm({ title: trimmed, mode });
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Fork conversation</Dialog.Title>
			<Dialog.Description>Create a new conversation from this point.</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-3 py-2">
			<div class="flex flex-col gap-1.5">
				<label for="fork-title" class="text-sm font-medium">Title</label>
				<Input id="fork-title" bind:value={title} />
			</div>
			<fieldset class="mt-2 flex flex-col gap-2.5">
				<legend class="mb-1.5 text-sm font-medium">Include messages</legend>
				<label
					class="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 has-checked:border-primary"
				>
					<input
						type="radio"
						name="fork-mode"
						value="active-path"
						bind:group={mode}
						class="accent-primary"
					/>
					<div>
						<div class="text-xs font-medium">Active path only</div>
						<div class="text-[11px] text-muted-foreground">Only the messages currently visible</div>
					</div>
				</label>
				<label
					class="flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 has-checked:border-primary"
				>
					<input
						type="radio"
						name="fork-mode"
						value="full-history"
						bind:group={mode}
						class="accent-primary"
					/>
					<div>
						<div class="text-xs font-medium">Full history</div>
						<div class="text-[11px] text-muted-foreground">
							All message branches up to this point
						</div>
					</div>
				</label>
			</fieldset>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleConfirm} disabled={!title.trim()}>Fork</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
