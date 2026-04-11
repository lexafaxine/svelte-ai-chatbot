<script lang="ts">
	let { data } = $props();
</script>

<div class="flex flex-1 flex-col overflow-hidden">
	<div class="flex flex-1 items-center justify-center p-4">
		<p class="text-muted-foreground">
			[Conversation view placeholder] — {data.conversation.title} ({data.conversation.id})
		</p>
	</div>
</div>
