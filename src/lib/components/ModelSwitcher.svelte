<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { MODELS } from '$lib/config/models';
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down';
	import OpenRouterLogo from './OpenRouterLogo.svelte';

	interface Props {
		model: string;
		onModelChange: (model: string) => void;
	}

	let { model, onModelChange }: Props = $props();

	const currentLabel = $derived(MODELS.find((m) => m.id === model)?.label ?? model);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium hover:bg-muted"
	>
		<OpenRouterLogo class="h-5 w-5" />
		<span class="max-w-50 truncate">{currentLabel}</span>
		<ChevronDownIcon class="h-3.5 w-3.5 text-muted-foreground" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="start" class="w-72">
		<DropdownMenu.RadioGroup value={model} onValueChange={(v) => v && onModelChange(v)}>
			{#each MODELS as m (m.id)}
				<DropdownMenu.RadioItem value={m.id}>
					<div class="flex flex-col">
						<span>{m.label}</span>
						<span class="text-xs text-muted-foreground">{m.id}</span>
					</div>
				</DropdownMenu.RadioItem>
			{/each}
		</DropdownMenu.RadioGroup>
	</DropdownMenu.Content>
</DropdownMenu.Root>
