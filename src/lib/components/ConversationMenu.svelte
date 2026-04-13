<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import MoreHorizontalIcon from '@lucide/svelte/icons/more-horizontal';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import Trash2Icon from '@lucide/svelte/icons/trash-2';
	import { chat } from '$lib/stores/chatStore.svelte';
	import type { Conversation } from '$lib/types';

	interface Props {
		conversation: Conversation;
		triggerClass?: string;
		align?: 'start' | 'end';
	}

	let { conversation, triggerClass = '', align = 'end' }: Props = $props();

	let deleteOpen = $state(false);
	let renameOpen = $state(false);
	let renameInput = $state('');
	const trimmedRename = $derived(renameInput.trim());
	const canSaveRename = $derived(trimmedRename.length > 0 && trimmedRename !== conversation.title);

	function openRename() {
		renameInput = conversation.title;
		renameOpen = true;
	}

	function handleConfirmRename(event: Event) {
		event.preventDefault();
		if (!canSaveRename) return;
		chat.setConversationTitle(conversation.id, trimmedRename);
		renameOpen = false;
	}

	async function handleConfirmDelete() {
		const wasActive = conversation.id === page.params.conversationId;
		chat.deleteConversation(conversation.id);
		deleteOpen = false;
		if (wasActive) await goto(resolve('/'));
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger
		class={`inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:bg-muted data-[state=open]:text-foreground ${triggerClass}`}
		aria-label="Conversation actions"
		onclick={(e: MouseEvent) => e.stopPropagation()}
	>
		<MoreHorizontalIcon class="h-4 w-4" />
	</DropdownMenu.Trigger>
	<DropdownMenu.Content {align} class="w-40">
		<DropdownMenu.Item onclick={openRename}>
			<PencilIcon />
			Rename
		</DropdownMenu.Item>
		<DropdownMenu.Item
			variant="destructive"
			class="text-destructive-soft focus:text-destructive-soft data-[variant=destructive]:text-destructive-soft data-[variant=destructive]:focus:bg-destructive-soft/10 data-[variant=destructive]:focus:text-destructive-soft dark:data-[variant=destructive]:focus:bg-destructive-soft/20 data-[variant=destructive]:*:[svg]:text-destructive-soft"
			onclick={() => (deleteOpen = true)}
		>
			<Trash2Icon />
			Delete
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>

<Dialog.Root bind:open={renameOpen}>
	<Dialog.Content>
		<form onsubmit={handleConfirmRename}>
			<Dialog.Header>
				<Dialog.Title>Rename conversation</Dialog.Title>
			</Dialog.Header>
			<div class="py-4">
				<Input
					bind:value={renameInput}
					placeholder="Conversation title"
					maxlength={100}
					autofocus
				/>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (renameOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={!canSaveRename}>Save</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete conversation?</Dialog.Title>
			<Dialog.Description>
				"{conversation.title}" and all of its messages will be permanently removed from this
				browser. This cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteOpen = false)}>Cancel</Button>
			<Button
				variant="outline"
				class="border-destructive-soft/40 bg-destructive-soft/10 text-destructive-soft hover:border-destructive-soft/50 hover:bg-destructive-soft/20 hover:text-destructive-soft"
				onclick={handleConfirmDelete}
			>
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
