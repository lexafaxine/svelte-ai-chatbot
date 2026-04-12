<script lang="ts">
	import { page } from '$app/state';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import { chat } from '$lib/stores/chatStore.svelte';
	import { getActivePath } from '$lib/utils/message-tree';

	const conversationId = $derived(page.params.conversationId!);
	const conversation = $derived(chat.getConversation(conversationId));
	const activePath = $derived(getActivePath(chat.messages, conversation?.tailId ?? null));
	const streamingMsgId = $derived(chat.streamingMessageIdFor(conversationId));
	const isStreaming = $derived(streamingMsgId !== null);
	const streamError = $derived(chat.streamErrorFor(conversationId));

	let scrollContainer: HTMLElement;

	$effect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		activePath.length;
		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
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
</script>

<div class="flex flex-1 flex-col overflow-hidden">
	<div bind:this={scrollContainer} class="flex-1 overflow-y-auto">
		<div class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
			{#each activePath as message (message.id)}
				<ChatMessage {message} isStreaming={message.id === streamingMsgId} />
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
