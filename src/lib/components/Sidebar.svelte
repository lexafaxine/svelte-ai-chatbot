<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Dialog from '$lib/components/ui/dialog';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import MessageSquareIcon from '@lucide/svelte/icons/message-square';
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import PanelLeftCloseIcon from '@lucide/svelte/icons/panel-left-close';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import { chat } from '$lib/stores/chatStore.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { loadApiKey, saveApiKey } from '$lib/stores/persistence';
	import ConversationMenu from './ConversationMenu.svelte';

	interface Props {
		onCollapse?: () => void;
	}

	let { onCollapse }: Props = $props();

	const currentId = $derived(page.params.conversationId ?? null);
	const sortedConversations = $derived(
		[...chat.conversations].sort((a, b) => b.updatedAt - a.updatedAt)
	);

	let settingsOpen = $state(false);
	let apiKeyInput = $state('');

	function openSettings() {
		apiKeyInput = loadApiKey() ?? '';
		settingsOpen = true;
	}

	function handleSaveKey() {
		const trimmed = apiKeyInput.trim();
		saveApiKey(trimmed || null);
		settingsOpen = false;
	}
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

	<nav class="flex-1 overflow-y-auto p-2">
		{#if sortedConversations.length === 0}
			<p class="px-2 py-4 text-center text-sm text-muted-foreground">No conversations yet</p>
		{:else}
			<ul class="flex flex-col gap-1">
				{#each sortedConversations as conversation (conversation.id)}
					{@const isActive = conversation.id === currentId}
					<li class="group relative">
						<Button
							href={`/chat/${conversation.id}`}
							variant={isActive ? 'secondary' : 'ghost'}
							class="h-auto w-full justify-start py-2 pr-9 text-left"
						>
							<MessageSquareIcon />
							<span class="flex-1 truncate">{conversation.title}</span>
						</Button>
						<ConversationMenu
							{conversation}
							triggerClass="absolute right-1.5 top-1/2 h-6 w-6 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</nav>

	<div class="flex flex-col gap-1 border-t border-sidebar-border p-3">
		<Button href="/" variant="outline" class="w-full justify-start">
			<PlusIcon />
			New chat
		</Button>
		<Button variant="ghost" class="w-full justify-start" onclick={openSettings}>
			<SettingsIcon />
			Settings
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

<Dialog.Root bind:open={settingsOpen}>
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
			<Button variant="outline" onclick={() => (settingsOpen = false)}>Cancel</Button>
			<Button onclick={handleSaveKey}>Save</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
