<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import PanelLeftCloseIcon from '@lucide/svelte/icons/panel-left-close';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import KeyboardIcon from '@lucide/svelte/icons/keyboard';
	import SearchIcon from '@lucide/svelte/icons/search';
	import XIcon from '@lucide/svelte/icons/x';
	import { chat } from '$lib/stores/chatStore.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { searchConversations } from '$lib/utils/search';
	import { SHORTCUTS, formatShortcut } from '$lib/config/shortcuts';
	import ConversationListItem from './ConversationListItem.svelte';
	import SettingsDialog from './SettingsDialog.svelte';

	interface Props {
		onCollapse?: () => void;
		searchInputRef?: HTMLInputElement | null;
	}

	let { onCollapse, searchInputRef = $bindable(null) }: Props = $props();

	const currentId = $derived(page.params.conversationId ?? null);
	const sortedConversations = $derived(
		[...chat.conversations].sort((a, b) => b.updatedAt - a.updatedAt)
	);

	let searchQuery = $state('');
	const trimmedQuery = $derived(searchQuery.trim());
	const searchResults = $derived(
		trimmedQuery ? searchConversations(trimmedQuery, chat.conversations, chat.messages) : null
	);

	let settingsOpen = $state(false);
	let shortcutsOpen = $state(false);

	const isMac = $derived(
		typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh')
	);

	const shortcuts = $derived(
		Object.values(SHORTCUTS).map((s) => ({
			keys: formatShortcut(s, isMac),
			description: s.description
		}))
	);
</script>

<aside
	class="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
>
	<div class="flex items-center justify-between border-b border-sidebar-border p-3">
		<span class="text-sm font-semibold">Chats</span>
		<Button variant="ghost" size="icon" onclick={onCollapse} aria-label="Collapse sidebar">
			<PanelLeftCloseIcon class="h-4 w-4" />
		</Button>
	</div>

	<div class="border-b border-sidebar-border p-2">
		<div class="relative">
			<SearchIcon
				class="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="text"
				placeholder="Search chats..."
				bind:value={searchQuery}
				bind:ref={searchInputRef}
				class="h-8 pr-8 pl-8"
				aria-label="Search conversations"
			/>
			{#if trimmedQuery}
				<button
					type="button"
					onclick={() => (searchQuery = '')}
					class="absolute top-1/2 right-1.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
					aria-label="Clear search"
				>
					<XIcon class="h-4 w-4" />
				</button>
			{/if}
		</div>
	</div>

	<nav class="flex-1 overflow-y-auto p-2">
		{#if searchResults !== null}
			{#if searchResults.length === 0}
				<p class="px-2 py-4 text-center text-sm text-muted-foreground">No results</p>
			{:else}
				<ul class="flex flex-col gap-1">
					{#each searchResults as result (result.conversation.id)}
						<ConversationListItem
							conversation={result.conversation}
							isActive={result.conversation.id === currentId}
							snippets={result.messageSnippets}
							totalMatches={result.totalMessageMatches}
						/>
					{/each}
				</ul>
			{/if}
		{:else if sortedConversations.length === 0}
			<p class="px-2 py-4 text-center text-sm text-muted-foreground">No conversations yet</p>
		{:else}
			<ul class="flex flex-col gap-1">
				{#each sortedConversations as conversation (conversation.id)}
					<ConversationListItem {conversation} isActive={conversation.id === currentId} />
				{/each}
			</ul>
		{/if}
	</nav>

	<div class="flex flex-col gap-1 border-t border-sidebar-border p-3">
		<Button href="/" variant="outline" class="w-full justify-start">
			<PlusIcon />
			New chat
		</Button>
		<Button variant="ghost" class="w-full justify-start" onclick={() => (settingsOpen = true)}>
			<SettingsIcon />
			Settings
		</Button>
		<Button variant="ghost" class="w-full justify-start" onclick={() => (shortcutsOpen = true)}>
			<KeyboardIcon />
			Shortcuts
		</Button>
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

<SettingsDialog bind:open={settingsOpen} />

<Dialog.Root bind:open={shortcutsOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Keyboard shortcuts</Dialog.Title>
			<Dialog.Description>Available keyboard shortcuts for quick navigation.</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-3 py-2">
			{#each shortcuts as shortcut (shortcut.keys)}
				<div class="flex items-center justify-between">
					<span class="text-sm">{shortcut.description}</span>
					<kbd
						class="rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
						>{shortcut.keys}</kbd
					>
				</div>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>
