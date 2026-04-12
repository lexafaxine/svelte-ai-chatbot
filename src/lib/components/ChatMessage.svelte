<script lang="ts">
	import type { Message } from '$lib/types';
	import { renderMarkdown } from '$lib/utils/markdown';

	interface Props {
		message: Message;
		isStreaming?: boolean;
	}

	let { message, isStreaming = false }: Props = $props();

	const isUser = $derived(message.role === 'user');
	const hasContent = $derived(message.content.length > 0);
	const hasReasoning = $derived(!!message.reasoning && message.reasoning.length > 0);
	const showPending = $derived(!isUser && isStreaming && !hasContent && !hasReasoning);
	const reasoningOpen = $derived(isStreaming && hasReasoning && !hasContent);
	const renderedContent = $derived(hasContent ? renderMarkdown(message.content) : '');
	const renderedReasoning = $derived(hasReasoning ? renderMarkdown(message.reasoning ?? '') : '');
</script>

{#if isUser}
	<div class="flex w-full justify-end">
		<div
			class="max-w-[80%] rounded-2xl bg-primary px-4 py-2 whitespace-pre-wrap text-primary-foreground"
		>
			{message.content}
		</div>
	</div>
{:else}
	<div class="flex w-full flex-col items-start gap-2">
		{#if showPending}
			<div class="flex items-center gap-2 px-2 text-muted-foreground" aria-live="polite">
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
				<span class="text-sm">Pending…</span>
			</div>
		{/if}

		{#if hasReasoning}
			<details class="w-full max-w-[80%]" open={reasoningOpen}>
				<summary class="cursor-pointer text-sm text-muted-foreground select-none">
					{isStreaming && !hasContent ? 'Thinking…' : 'Thoughts'}
				</summary>
				<div
					class="prose prose-sm mt-2 max-w-none border-l-2 border-muted pl-3 text-sm text-muted-foreground [--tw-prose-invert-pre-bg:transparent] [--tw-prose-pre-bg:transparent] dark:prose-invert"
				>
					<!-- safe: renderMarkdown sanitizes with DOMPurify before returning -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderedReasoning}
				</div>
			</details>
		{/if}

		{#if hasContent}
			<div class="max-w-[80%] rounded-2xl bg-muted px-4 py-2 text-foreground">
				<div
					class="prose prose-sm max-w-none [--tw-prose-invert-pre-bg:transparent] [--tw-prose-pre-bg:transparent] dark:prose-invert"
				>
					<!-- safe: renderMarkdown sanitizes with DOMPurify before returning -->
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html renderedContent}
				</div>
				{#if isStreaming}
					<span class="animate-pulse">▍</span>
				{/if}
			</div>
		{/if}
	</div>
{/if}
