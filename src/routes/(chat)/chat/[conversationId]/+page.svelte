<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import ModelSwitcher from '$lib/components/ModelSwitcher.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import FileDownIcon from '@lucide/svelte/icons/file-down';
	import { chat } from '$lib/stores/chatStore.svelte';
	import { getActivePath, getSiblings } from '$lib/utils/message-tree';
	import { downloadConversationJSON } from '$lib/utils/export';

	const conversationId = $derived(page.params.conversationId!);
	const conversation = $derived(chat.getConversation(conversationId));
	const activePath = $derived(getActivePath(chat.messages, conversation?.tailId ?? null));
	const streamingMsgId = $derived(chat.streamingMessageIdFor(conversationId));
	const isStreaming = $derived(streamingMsgId !== null);
	const streamError = $derived(chat.streamErrorFor(conversationId));

	let scrollContainer: HTMLElement;

	let prevPathFingerprint = '';
	let suppressNextScroll = false;

	// Auto-scroll policy. Three regimes:
	//   1. Visible thread changed (new message, switched branch): jump to
	//      the bottom — unless `suppressNextScroll` was set by a sibling
	//      switch that should preserve the user's current position.
	//   2. Same thread, currently streaming, user is already near the
	//      bottom: follow the new tokens.
	//   3. Otherwise: leave scroll alone (user has scrolled up to read).
	$effect(() => {
		const fingerprint = `${activePath.length}:${conversation?.tailId ?? ''}`;
		const isStreamingHere = streamingMsgId !== null;

		if (!scrollContainer) return;

		if (fingerprint !== prevPathFingerprint) {
			prevPathFingerprint = fingerprint;
			if (!suppressNextScroll) {
				scrollContainer.scrollTop = scrollContainer.scrollHeight;
			}
			suppressNextScroll = false;
			return;
		}

		if (isStreamingHere) {
			const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
			const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
			if (nearBottom) {
				scrollContainer.scrollTop = scrollHeight;
			}
		}
	});

	function handleSubmit(content: string) {
		if (!conversation) return;
		const userMsg = chat.appendMessage(
			conversation.id,
			'user',
			content,
			conversation.tailId,
			conversation.model
		);
		chat.streamReply(conversation.id, userMsg.id);
	}

	function handleEdit(messageId: string, newContent: string) {
		chat.editAndResubmit(conversationId, messageId, newContent);
	}

	function handleRegenerate(messageId: string) {
		chat.regenerate(conversationId, messageId);
	}

	function handleSwitchSibling(targetId: string) {
		suppressNextScroll = true;
		chat.switchSibling(conversationId, targetId);
	}

	let forkDialogOpen = $state(false);
	let forkAtMessageId = $state('');
	let forkTitle = $state('');
	let forkMode = $state<'active-path' | 'full-history'>('active-path');

	function handleFork(messageId: string) {
		forkAtMessageId = messageId;
		forkTitle = `Fork of ${conversation?.title ?? ''}`;
		forkMode = 'active-path';
		forkDialogOpen = true;
	}

	async function executeFork() {
		forkDialogOpen = false;
		const newId = chat.forkConversation(conversationId, forkAtMessageId, forkMode);
		if (newId && forkTitle.trim()) {
			chat.setConversationTitle(newId, forkTitle.trim());
		}
		if (newId) {
			await goto(resolve('/(chat)/chat/[conversationId]', { conversationId: newId }));
		}
	}
</script>

<div class="flex flex-1 flex-col overflow-hidden">
	{#if conversation}
		<div class="flex items-center justify-between px-4 py-1">
			<ModelSwitcher
				model={conversation.model}
				onModelChange={(model) => chat.setConversationModel(conversation.id, model)}
			/>
			<Button
				variant="ghost"
				class="h-8 shrink-0 gap-1.5 px-2 text-sm font-medium"
				aria-label="Export conversation as JSON"
				onclick={() => downloadConversationJSON(conversation, activePath)}
			>
				<FileDownIcon class="h-4 w-4" />
				Export JSON
			</Button>
		</div>
	{/if}
	<div bind:this={scrollContainer} class="flex-1 overflow-y-auto">
		<div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
			{#each activePath as message (message.id)}
				<ChatMessage
					{message}
					isStreaming={message.id === streamingMsgId}
					siblings={getSiblings(chat.messages, message.id)}
					onSwitchSibling={handleSwitchSibling}
					onEdit={handleEdit}
					onRegenerate={handleRegenerate}
					onFork={handleFork}
				/>
			{/each}
			{#if streamError}
				<div
					class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
				>
					{streamError}
					<button
						type="button"
						class="ml-2 underline"
						onclick={() => chat.clearStreamError(conversationId)}
					>
						Dismiss
					</button>
				</div>
			{/if}
		</div>
	</div>
	<div class="border-t border-border">
		<div class="mx-auto w-full max-w-3xl">
			<ChatInput
				onSubmit={handleSubmit}
				{isStreaming}
				onStop={() => chat.stopStreaming(conversationId)}
			/>
		</div>
	</div>
</div>

<Dialog.Root bind:open={forkDialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>Fork conversation</Dialog.Title>
			<Dialog.Description>Create a new conversation from this point.</Dialog.Description>
		</Dialog.Header>
		<div class="flex flex-col gap-3 py-2">
			<div class="flex flex-col gap-1.5">
				<label for="fork-title" class="text-sm font-medium">Title</label>
				<Input id="fork-title" bind:value={forkTitle} />
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
						bind:group={forkMode}
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
						bind:group={forkMode}
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
			<Button variant="outline" onclick={() => (forkDialogOpen = false)}>Cancel</Button>
			<Button onclick={executeFork} disabled={!forkTitle.trim()}>Fork</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
