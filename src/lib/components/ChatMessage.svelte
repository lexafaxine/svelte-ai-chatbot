<script lang="ts">
	import type { Message } from '$lib/types';
	import { isReasoningModel } from '$lib/config/models';
	import { renderMarkdown } from '$lib/utils/markdown';

	interface Props {
		message: Message;
		isStreaming?: boolean;
	}

	let { message, isStreaming = false }: Props = $props();

	const isUser = $derived(message.role === 'user');
	const hasContent = $derived(message.content.length > 0);
	const hasReasoning = $derived(!!message.reasoning && message.reasoning.length > 0);
	const modelSupportsReasoning = $derived(isReasoningModel(message.model));
	const showPending = $derived(!isUser && isStreaming && !hasContent && !hasReasoning);
	const pendingLabel = $derived(modelSupportsReasoning ? 'Thinking' : 'Generating response');
	const reasoningOpen = $derived(isStreaming && hasReasoning && !hasContent);
	const renderedContent = $derived(hasContent ? renderMarkdown(message.content) : '');
	const renderedReasoning = $derived(hasReasoning ? renderMarkdown(message.reasoning ?? '') : '');
</script>

{#if isUser}
	<div class="flex w-full justify-end">
		<div
			class="bg-primary text-primary-foreground max-w-[80%] rounded-2xl px-4 py-2 whitespace-pre-wrap"
		>
			{message.content}
		</div>
	</div>
{:else}
	<div class="flex w-full flex-col items-start gap-2">
		{#if showPending}
			<div class="text-muted-foreground flex items-center gap-2 px-2" aria-live="polite">
				<svg class="h-3 w-8" viewBox="0 0 40 10" aria-hidden="true">
					<circle cx="5" cy="5" r="3" fill="currentColor">
						<animate
							attributeName="opacity"
							values="0.2;1;0.2"
							dur="1.2s"
							begin="0s"
							repeatCount="indefinite"
						/>
					</circle>
					<circle cx="20" cy="5" r="3" fill="currentColor">
						<animate
							attributeName="opacity"
							values="0.2;1;0.2"
							dur="1.2s"
							begin="0.2s"
							repeatCount="indefinite"
						/>
					</circle>
					<circle cx="35" cy="5" r="3" fill="currentColor">
						<animate
							attributeName="opacity"
							values="0.2;1;0.2"
							dur="1.2s"
							begin="0.4s"
							repeatCount="indefinite"
						/>
					</circle>
				</svg>
				<span class="text-sm">{pendingLabel}…</span>
			</div>
		{/if}

		{#if hasReasoning}
			<details class="w-full max-w-[80%]" open={reasoningOpen}>
				<summary class="text-muted-foreground cursor-pointer text-sm select-none">
					{isStreaming && !hasContent ? 'Thinking…' : 'Thoughts'}
				</summary>
				<div
					class="text-muted-foreground border-muted prose prose-sm mt-2 max-w-none border-l-2 pl-3 text-sm"
				>
					{@html renderedReasoning}
				</div>
			</details>
		{/if}

		{#if hasContent}
			<div class="bg-muted text-foreground max-w-[80%] rounded-2xl px-4 py-2">
				<div class="prose prose-sm max-w-none">
					{@html renderedContent}
				</div>
				{#if isStreaming}
					<span class="animate-pulse">▍</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}
