<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { Button } from '$lib/components/ui/button';
	import PanelLeftOpenIcon from '@lucide/svelte/icons/panel-left-open';

	let { children } = $props();

	let sidebarOpen = $state(true);
</script>

<div class="flex h-screen w-screen overflow-hidden">
	{#if sidebarOpen}
		<Sidebar onCollapse={() => (sidebarOpen = false)} />
	{:else}
		<div class="flex items-start border-r border-border p-2">
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (sidebarOpen = true)}
				aria-label="Open sidebar"
			>
				<PanelLeftOpenIcon class="h-4 w-4" />
			</Button>
		</div>
	{/if}
	<main class="flex flex-1 flex-col overflow-hidden">
		{@render children()}
	</main>
</div>
