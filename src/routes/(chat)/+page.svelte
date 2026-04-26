<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import ModelSwitcher from '$lib/components/chat/ModelSwitcher.svelte';
	import { chat } from '$lib/stores/chatStore.svelte';
	import { DEFAULT_MODEL } from '$lib/config/models';

	let selectedModel = $state(DEFAULT_MODEL);

	async function handleSubmit(content: string) {
		const conversation = chat.createConversation(selectedModel);
		const userMsg = chat.appendMessage(conversation.id, 'user', content, null, conversation.model);
		chat.streamReply(conversation.id, userMsg.id);
		await goto(resolve('/(chat)/chat/[conversationId]', { conversationId: conversation.id }));
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center p-8">
	<div class="w-full max-w-2xl">
		<h1 class="mb-4 text-center text-3xl font-semibold">What can I help with?</h1>
		<div class="mb-6 flex justify-center">
			<ModelSwitcher model={selectedModel} onModelChange={(m) => (selectedModel = m)} />
		</div>
		<ChatInput onSubmit={handleSubmit} />
	</div>
</div>
