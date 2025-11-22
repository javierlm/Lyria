<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { setLocale } from '$i18n/i18n-svelte';
	import { loadLocaleAsync } from '$i18n/i18n-util.async';
	import AppLanguageSelector from '$lib/components/AppLanguageSelector.svelte';
	import ReloadPrompt from '$lib/components/ReloadPrompt.svelte';
	import LL from '$i18n/i18n-svelte';

	let { data, children } = $props();

	// Cargar locale inicial de forma asíncrona
	$effect(() => {
		loadLocaleAsync(data.locale).then(() => {
			setLocale(data.locale);
		});
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
	<AppLanguageSelector />
	{@render children()}
	<ReloadPrompt />
</div>

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

	.container {
		width: 100%;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		position: relative;
	}
</style>
