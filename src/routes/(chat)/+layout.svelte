<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import PanelLeftOpenIcon from '@lucide/svelte/icons/panel-left-open';

	let { children } = $props();

	let sidebarOpen = $state(true);
</script>

<div class="flex h-dvh w-screen overflow-hidden">
	<!-- Mobile backdrop -->
	<button
		type="button"
		class={cn(
			'fixed inset-0 z-30 bg-black/30 transition-opacity duration-200 md:hidden',
			sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
		)}
		onclick={() => (sidebarOpen = false)}
		aria-label="Close sidebar"
	></button>

	<!-- Sidebar wrapper -->
	<div
		class={cn(
			'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40',
			'max-md:transition-transform max-md:duration-200 max-md:ease-in-out',
			sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
			'md:shrink-0 md:overflow-hidden md:transition-[width] md:duration-200 md:ease-in-out',
			sidebarOpen ? 'md:w-64' : 'md:w-0'
		)}
	>
		<Sidebar onCollapse={() => (sidebarOpen = false)} />
	</div>

	<div
		class={cn(
			'flex shrink-0 items-start border-r border-border p-2',
			sidebarOpen && 'max-md:invisible md:hidden'
		)}
	>
		<Button
			variant="ghost"
			size="icon"
			onclick={() => (sidebarOpen = true)}
			aria-label="Open sidebar"
		>
			<PanelLeftOpenIcon class="h-4 w-4" />
		</Button>
	</div>
	<main class="flex flex-1 flex-col overflow-hidden">
		{@render children()}
	</main>
</div>
