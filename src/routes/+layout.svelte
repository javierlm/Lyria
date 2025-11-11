<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Lyria</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}

<style>
	:root {
		--primary-color: #ef4444;
		--primary-color-rgb: 239, 68, 68;
		--primary-color-hover: #b91c1c;
		--secondary-color: #d43b74;
		--text-color: #1f2937;
		--background-color: #f9fafb;
		--card-background: #ffffff;
		--border-color: #e5e7eb;
		--shadow-color: rgba(0, 0, 0, 0.1);
		--darker-shadow-color: rgba(0, 0, 0, 0.2);
		--button-shadow-color: rgba(0, 0, 0, 0.3);
	}

	:global(html, body) {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: 'Inter', sans-serif;
		background-color: var(--background-color);
		color: var(--text-color);
	}
</style>
