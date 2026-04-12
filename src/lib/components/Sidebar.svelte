<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import { chat } from '$lib/stores/chatStore.svelte';
	import { theme } from '$lib/stores/theme.svelte';

	const currentId = $derived(page.params.conversationId ?? null);
	const sortedConversations = $derived(
		[...chat.conversations].sort((a, b) => b.updatedAt - a.updatedAt)
	);
</script>

<aside
	class="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
>
	<div class="border-b border-sidebar-border p-3">
		<Button href="/" variant="outline" class="w-full justify-start">
			<PlusIcon />
			New chat
		</Button>
	</div>

	<nav class="flex-1 overflow-y-auto p-2">
		{#if sortedConversations.length === 0}
			<p class="px-2 py-4 text-center text-sm text-muted-foreground">No conversations yet</p>
		{:else}
			<ul class="flex flex-col gap-1">
				{#each sortedConversations as conversation (conversation.id)}
					{@const isActive = conversation.id === currentId}
					<li>
						<Button
							href={`/chat/${conversation.id}`}
							variant={isActive ? 'secondary' : 'ghost'}
							class="h-auto w-full justify-start py-2 text-left"
						>
							<MessageSquareIcon />
							<span class="flex-1 truncate">{conversation.title}</span>
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>

	<div class="border-t border-sidebar-border p-3">
		<Button variant="ghost" class="w-full justify-start" onclick={() => theme.toggle()}>
			{#if theme.current === 'dark'}
				<SunIcon />
				Light mode
			{:else}
				<MoonIcon />
				Dark mode
			{/if}
		</Button>
	</div>
</aside>
