<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { fade } from 'svelte/transition';
	import type { Conversation } from '$lib/types';
	import type { Snippet } from '$lib/utils/search';
	import ConversationMenu from './ConversationMenu.svelte';

	interface Props {
		conversation: Conversation;
		isActive: boolean;
		// When `snippets` is provided we render the search-result layout:
		// title + stacked snippet lines + optional "+N more". Otherwise the
		// normal sidebar layout with a fade transition on title changes.
		snippets?: Snippet[];
		totalMatches?: number;
	}

	let { conversation, isActive, snippets, totalMatches = 0 }: Props = $props();
</script>

<li class="group relative">
	<Button
		href={`/chat/${conversation.id}`}
		variant={isActive ? 'secondary' : 'ghost'}
		class={snippets
			? 'h-auto w-full items-start justify-start py-2 pr-9 text-left'
			: 'h-auto w-full justify-start py-2 pr-9 text-left'}
	>
		{#if snippets}
			<span class="flex min-w-0 flex-1 flex-col gap-0.5">
				<span class="truncate">{conversation.title}</span>
				{#each snippets as snippet, i (i)}
					<span class="truncate text-xs font-normal text-muted-foreground">
						{snippet.before}<span class="font-semibold text-foreground">{snippet.match}</span
						>{snippet.after}
					</span>
				{/each}
				{#if totalMatches > snippets.length}
					<span class="truncate text-xs font-normal text-muted-foreground italic">
						+{totalMatches - snippets.length} more
					</span>
				{/if}
			</span>
		{:else}
			<span class="flex-1 truncate">
				{#key conversation.title}
					<span class="block truncate" in:fade={{ duration: 200 }}>
						{conversation.title}
					</span>
				{/key}
			</span>
		{/if}
	</Button>
	<ConversationMenu
		{conversation}
		triggerClass="absolute right-1.5 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
	/>
</li>
