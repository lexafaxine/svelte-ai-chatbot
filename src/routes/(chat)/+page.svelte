<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChatInput from '$lib/components/ChatInput.svelte';
	import { chat } from '$lib/stores/chatStore.svelte';
	import { DEFAULT_MODEL } from '$lib/config/models';

	async function handleSubmit(content: string) {
		const conversation = chat.createConversation(DEFAULT_MODEL);
		const userMsg = chat.appendMessage(
			conversation.id,
			'user',
			content,
			null,
			conversation.model
		);
		chat.streamReply(conversation.id, userMsg.id);
		await goto(resolve('/(chat)/chat/[conversationId]', { conversationId: conversation.id }));
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center p-8">
	<div class="w-full max-w-2xl">
		<h1 class="mb-8 text-center text-3xl font-semibold">What can I help with?</h1>
		<ChatInput onSubmit={handleSubmit} />
	</div>
</div>
