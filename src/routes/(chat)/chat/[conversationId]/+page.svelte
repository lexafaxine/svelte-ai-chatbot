<script lang="ts">
	import { page } from '$app/state';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import ConversationTree from '$lib/components/ConversationTree.svelte';
	import ModelSwitcher from '$lib/components/ModelSwitcher.svelte';
	import { chat } from '$lib/stores/chatStore.svelte';
	import { getActivePath, getSiblings } from '$lib/utils/message-tree';

	const conversationId = $derived(page.params.conversationId!);
	const conversation = $derived(chat.getConversation(conversationId));
	const activePath = $derived(getActivePath(chat.messages, conversation?.tailId ?? null));
	const streamingMsgId = $derived(chat.streamingMessageIdFor(conversationId));
	const isStreaming = $derived(streamingMsgId !== null);
	const streamError = $derived(chat.streamErrorFor(conversationId));

	let scrollContainer: HTMLElement;

	let prevPathFingerprint = '';
	let suppressNextScroll = false;

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

	function handleSelectPath(tailId: string) {
		suppressNextScroll = true;
		chat.setTail(conversationId, tailId);
	}
</script>

<div class="flex flex-1 flex-col overflow-hidden">
	{#if conversation}
		<div class="flex items-center justify-between px-4 py-1">
			<ModelSwitcher
				model={conversation.model}
				onModelChange={(model) => chat.setConversationModel(conversation.id, model)}
			/>
			<ConversationTree {conversation} messages={chat.messages} onSelectPath={handleSelectPath} />
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
