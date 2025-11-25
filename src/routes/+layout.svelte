<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { setLocale } from '$i18n/i18n-svelte';
	import AppLanguageSelector from '$lib/components/AppLanguageSelector.svelte';
	import ReloadPrompt from '$lib/components/ReloadPrompt.svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import LL from '$i18n/i18n-svelte';

	let { data, children } = $props();

	setLocale(data.locale);

	$effect(() => {
		setLocale(data.locale);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>{$LL.appName()}</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="container">
	<div class="top-controls">
		<AppLanguageSelector />
		<ThemeToggle />
	</div>
	{@render children()}
	<ReloadPrompt />
</div>

<style>
	:root {
		--primary-color: #b91c1c;
		--primary-color-rgb: 185, 28, 28;
		--primary-color-hover: #991b1b;
		--on-primary-color: #ffffff;

		--secondary-color: #d43b74;
		--text-color: #1f2937;
		--background-color: #f9fafb;
		--card-background: #ffffff;
		--border-color: #e5e7eb;
		--shadow-color: rgba(0, 0, 0, 0.1);
		--darker-shadow-color: rgba(0, 0, 0, 0.2);
		--button-shadow-color: rgba(0, 0, 0, 0.3);

		--theme-transition-duration: 0.5s;
		--theme-transition-timing: ease-in-out;
	}

	:global(html) {
		transition: background-color var(--theme-transition-duration) var(--theme-transition-timing);
	}

	:global(html.dark-mode) {
		--primary-color: #f87171;
		--primary-color-rgb: 248, 113, 113;
		--primary-color-hover: #ef4444;
		--background-color: #101523;
		--on-primary-color: #101523;

		--secondary-color: #d43b74;
		--text-color: #f9fafb;
		--card-background: #1f2937;
		--border-color: #374151;
		--shadow-color: rgba(0, 0, 0, 0.3);
		--darker-shadow-color: rgba(0, 0, 0, 0.5);
		--button-shadow-color: rgba(0, 0, 0, 0.6);
	}

	:global(body) {
		font-family: 'Inter', sans-serif;
		background-color: var(--background-color);
		color: var(--text-color);
		transition:
			background-color var(--theme-transition-duration) var(--theme-transition-timing),
			color var(--theme-transition-duration) var(--theme-transition-timing);
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

	.container {
		width: 100%;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		min-height: 100dvh;
		position: relative;
		padding-top: env(safe-area-inset-top);
		padding-bottom: env(safe-area-inset-bottom);
	}

	.top-controls {
		display: flex;
		justify-content: flex-start;
		align-items: center;
		padding: 1rem;
		gap: 0.5rem;
		position: absolute;
		top: 0;
		left: 0;
		z-index: 50;
	}
</style>
