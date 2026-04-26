<script lang="ts">
	import type { Message } from '$lib/types';
	import { renderMarkdown } from '$lib/utils/markdown';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import GitForkIcon from '@lucide/svelte/icons/git-fork';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';

	interface Props {
		message: Message;
		isStreaming?: boolean;
		siblings?: Message[];
		onSwitchSibling?: (targetId: string) => void;
		onEdit?: (messageId: string, newContent: string) => void;
		onRegenerate?: (messageId: string) => void;
		onFork?: (messageId: string) => void;
	}

	let {
		message,
		isStreaming = false,
		siblings = [],
		onSwitchSibling,
		onEdit,
		onRegenerate,
		onFork
	}: Props = $props();

	const isUser = $derived(message.role === 'user');
	const hasContent = $derived(message.content.length > 0);
	const hasReasoning = $derived(!!message.reasoning && message.reasoning.length > 0);
	const showPending = $derived(!isUser && isStreaming && !hasContent && !hasReasoning);
	const reasoningOpen = $derived(isStreaming && hasReasoning && !hasContent);
	const renderedContent = $derived(hasContent ? renderMarkdown(message.content) : '');
	const renderedReasoning = $derived(hasReasoning ? renderMarkdown(message.reasoning ?? '') : '');

	const hasSiblings = $derived(siblings.length > 1);
	const siblingIndex = $derived(siblings.findIndex((s) => s.id === message.id));

	let editing = $state(false);
	let editValue = $state('');
	let actionsOpen = $state(false);

	function toggleActions(e: MouseEvent) {
		e.stopPropagation();
		actionsOpen = !actionsOpen;
	}

	$effect(() => {
		if (!actionsOpen) return;
		const handler = () => (actionsOpen = false);
		window.addEventListener('click', handler);
		return () => window.removeEventListener('click', handler);
	});

	function startEdit() {
		editValue = message.content;
		editing = true;
	}

	function submitEdit() {
		const trimmed = editValue.trim();
		if (trimmed && trimmed !== message.content) {
			onEdit?.(message.id, trimmed);
		}
		editing = false;
	}

	function cancelEdit() {
		editing = false;
	}
</script>

{#snippet siblingNav(extraClass = '')}
	<div class="flex items-center gap-1 text-xs text-muted-foreground {extraClass}">
		<Button
			variant="ghost"
			size="icon"
			class="h-5 w-5"
			disabled={siblingIndex <= 0}
			onclick={() => onSwitchSibling?.(siblings[siblingIndex - 1].id)}
			aria-label="Previous version"
		>
			<ChevronLeftIcon class="h-3 w-3" />
		</Button>
		<span>{siblingIndex + 1} / {siblings.length}</span>
		<Button
			variant="ghost"
			size="icon"
			class="h-5 w-5"
			disabled={siblingIndex >= siblings.length - 1}
			onclick={() => onSwitchSibling?.(siblings[siblingIndex + 1].id)}
			aria-label="Next version"
		>
			<ChevronRightIcon class="h-3 w-3" />
		</Button>
	</div>
{/snippet}

{#if isUser}
	<div class="group flex w-full flex-col items-end">
		{#if editing}
			<div class="flex w-full max-w-[80%] flex-col gap-2">
				<Textarea bind:value={editValue} rows={3} class="resize-none" />
				<div class="flex justify-end gap-2">
					<Button variant="outline" size="sm" onclick={cancelEdit}>Cancel</Button>
					<Button size="sm" onclick={submitEdit}>Submit</Button>
				</div>
			</div>
		{:else}
			<div
				role="button"
				tabindex="0"
				onclick={toggleActions}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') toggleActions(e as unknown as MouseEvent);
				}}
				class="max-w-[90%] cursor-pointer rounded-2xl bg-primary px-4 py-2 whitespace-pre-wrap text-primary-foreground md:cursor-default"
			>
				{message.content}
			</div>
			<div
				class="flex items-center gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100"
				class:max-md:opacity-100={actionsOpen}
				class:max-md:opacity-0={!actionsOpen}
			>
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={startEdit}
					aria-label="Edit message"
				>
					<PencilIcon class="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={() => onFork?.(message.id)}
					aria-label="Fork conversation from here"
				>
					<GitForkIcon class="h-3.5 w-3.5" />
				</Button>
			</div>
		{/if}
		{#if hasSiblings && !editing}
			{@render siblingNav('mt-1 w-full justify-end')}
		{/if}
	</div>
{:else}
	<div class="group flex w-full flex-col items-start gap-2">
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
			<div class="max-w-[80%] text-foreground">
				<div
					class="prose prose-sm max-w-none dark:prose-invert [&_pre]:rounded-lg [&_pre]:bg-muted"
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

		{#if !isStreaming && hasContent}
			<div
				class="flex items-center gap-1 transition-opacity md:opacity-0 md:group-hover:opacity-100"
			>
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={() => onRegenerate?.(message.id)}
					aria-label="Regenerate response"
				>
					<RefreshCwIcon class="h-3.5 w-3.5" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={() => onFork?.(message.id)}
					aria-label="Fork conversation from here"
				>
					<GitForkIcon class="h-3.5 w-3.5" />
				</Button>
			</div>
		{/if}

		{#if hasSiblings}
			{@render siblingNav()}
		{/if}
	</div>
{/if}
