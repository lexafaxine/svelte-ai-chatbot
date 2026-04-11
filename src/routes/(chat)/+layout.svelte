<script lang="ts">
	let { children } = $props();
</script>

<div class="flex h-screen w-screen overflow-hidden">
	<aside class="bg-sidebar border-sidebar-border w-64 shrink-0 border-r p-4">
		<p class="text-muted-foreground text-sm">[Sidebar placeholder]</p>
	</aside>
	<main class="flex flex-1 flex-col overflow-hidden">
		{@render children()}
	</main>
</div>
