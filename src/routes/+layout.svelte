<script lang="ts">
	import './layout.css';
	import hljsLight from 'highlight.js/styles/github.css?url';
	import hljsDark from 'highlight.js/styles/github-dark.css?url';
	import favicon from '$lib/assets/favicon.svg';
	import { theme } from '$lib/stores/theme.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href={theme.current === 'dark' ? hljsDark : hljsLight} />
</svelte:head>
{@render children()}
