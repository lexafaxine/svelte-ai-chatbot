<script lang="ts">
	import type { Message, Conversation } from '$lib/types';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import GitBranchIcon from '@lucide/svelte/icons/git-branch';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { SvelteMap } from 'svelte/reactivity';
	import { getActivePath, getLeafDescendant } from '$lib/utils/message-tree';

	interface TreeNode {
		message: Message;
		children: TreeNode[];
	}

	interface Props {
		conversation: Conversation;
		messages: Message[];
		onSelectPath: (tailId: string) => void;
	}

	let { conversation, messages, onSelectPath }: Props = $props();

	let open = $state(false);
	// collapsed state of each node
	let collapsed = new SvelteMap<string, boolean>();

	function toggleCollapse(id: string) {
		collapsed.set(id, !collapsed.get(id));
	}

	const convMessages = $derived(messages.filter((m) => m.conversationId === conversation.id));

	const activePathIds = $derived(
		new Set(getActivePath(messages, conversation.tailId).map((m) => m.id))
	);

	const roots = $derived.by(() => {
		const childrenOf = new SvelteMap<string | null, Message[]>();
		for (const m of convMessages) {
			const key = m.parentId;
			const list = childrenOf.get(key);
			if (list) list.push(m);
			else childrenOf.set(key, [m]);
		}

		function build(parentId: string | null): TreeNode[] {
			const children = childrenOf.get(parentId) ?? [];
			return children
				.sort((a, b) => a.createdAt - b.createdAt)
				.map((m) => ({ message: m, children: build(m.id) }));
		}

		return build(null);
	});

	function isLeaf(node: TreeNode): boolean {
		return node.children.length === 0;
	}

	function isFork(node: TreeNode): boolean {
		return node.children.length > 1;
	}

	function treeHasFork(nodes: TreeNode[]): boolean {
		for (const n of nodes) {
			if (n.children.length > 1 || treeHasFork(n.children)) return true;
		}
		return false;
	}

	const hasForks = $derived(treeHasFork(roots));

	function truncate(text: string, max = 30): string {
		const single = text.replace(/\n/g, ' ');
		if (single.length <= max) return single;
		return single.slice(0, max) + '…';
	}

	// Only show forks view when there are siblings for better accessability
	// Walk from `start` along single-child edges, collecting the chain, show plain chain
	// Stops at a leaf or fork (node with 2+ children).
	function collectChain(start: TreeNode): TreeNode[] {
		const chain: TreeNode[] = [start];
		let cur = start;
		while (cur.children.length === 1) {
			cur = cur.children[0];
			chain.push(cur);
		}
		return chain;
	}

	function handleChainClick(chain: TreeNode[]) {
		const last = chain[chain.length - 1];
		if (!isLeaf(last)) {
			toggleCollapse(last.message.id);
			return;
		}
		const map = { ...conversation.activeChildMap };
		const leafId = getLeafDescendant(messages, last.message.id, map);
		onSelectPath(leafId);
		open = false;
	}
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		<Button
			variant="ghost"
			class="h-8 gap-1.5 px-2"
			onclick={() => (open = true)}
			aria-label="Show conversation tree"
		>
			<GitBranchIcon class="h-5 w-5" />
			<span class="text-sm">Switch conversation path</span>
		</Button>
	</Tooltip.Trigger>
	<Tooltip.Content>
		<p>Show full conversation tree</p>
	</Tooltip.Content>
</Tooltip.Root>

<Dialog.Root bind:open>
	<Dialog.Content class="max-h-[80vh] sm:max-w-2xl overflow-hidden">
		<Dialog.Header>
			<Dialog.Title>Conversation Tree</Dialog.Title>
			<Dialog.Description>
				Click a leaf node to switch to that conversation path.
			</Dialog.Description>
		</Dialog.Header>
		<div class="max-h-[60vh] overflow-x-auto overflow-y-auto py-2">
			{#snippet renderChain(startNode: TreeNode, depth: number)}
				{@const chain = collectChain(startNode)}
				{@const last = chain[chain.length - 1]}
				{@const lastIsLeaf = isLeaf(last)}
				{@const lastIsFork = isFork(last)}
				{@const hasAnyActive = chain.some((n) => activePathIds.has(n.message.id))}
				{@const isActiveTail = lastIsLeaf && last.message.id === conversation.tailId}
				{@const isCollapsed = collapsed.get(last.message.id) ?? depth > 4}
				<div class="flex items-start gap-1" style="padding-left: {depth * 20}px">
					{#if lastIsFork}
						<button
							type="button"
							class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
							onclick={() => toggleCollapse(last.message.id)}
							aria-label={isCollapsed ? 'Expand' : 'Collapse'}
						>
							<ChevronRightIcon
								class="h-3.5 w-3.5 transition-transform {isCollapsed ? '' : 'rotate-90'}"
							/>
						</button>
					{:else}
						<span class="w-5 shrink-0"></span>
					{/if}
					<button
						type="button"
						class="flex min-w-0 cursor-pointer flex-wrap items-center gap-0.5 rounded px-1.5 py-0.5 text-left text-sm hover:bg-muted {hasForks
							? isActiveTail
								? 'bg-primary/15 font-medium text-primary'
								: hasAnyActive
									? 'bg-muted/60 text-foreground'
									: 'text-muted-foreground'
							: 'text-foreground'}"
						onclick={() => handleChainClick(chain)}
					>
						{#each chain as node, i (node.message.id)}
							{#if i > 0}
								<span class="mx-0.5 text-muted-foreground/50">→</span>
							{/if}
							<span class="inline-flex items-center gap-1">
								<span
									class="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold {node
										.message.role === 'user'
										? 'bg-primary/20 text-primary'
										: 'bg-muted-foreground/20 text-muted-foreground'}"
								>
									{node.message.role === 'user' ? 'U' : 'A'}
								</span>
								<span class="max-w-40 truncate">{truncate(node.message.content || '(empty)')}</span>
							</span>
						{/each}
					</button>
				</div>
				{#if lastIsFork && !isCollapsed}
					{#each last.children as child (child.message.id)}
						{@render renderChain(child, depth + 1)}
					{/each}
				{/if}
			{/snippet}

			{#if roots.length === 0}
				<p class="px-4 py-8 text-center text-sm text-muted-foreground">No messages yet</p>
			{:else}
				{#each roots as root (root.message.id)}
					{@render renderChain(root, 0)}
				{/each}
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
