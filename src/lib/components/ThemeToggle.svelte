<script lang="ts">
	import { themeStore, type Theme } from '$lib/stores/themeStore.svelte';
	import Sun from 'phosphor-svelte/lib/Sun';
	import Moon from 'phosphor-svelte/lib/Moon';
	import Desktop from 'phosphor-svelte/lib/Desktop';
	import { fade, scale } from 'svelte/transition';
	import LL from '$i18n/i18n-svelte';

	const themeLabels = $derived({
		light: $LL.theme.light(),
		dark: $LL.theme.dark(),
		system: $LL.theme.system()
	});

	function cycleTheme() {
		const current = themeStore.theme;
		let next: Theme;

		if (current === 'system') next = 'light';
		else if (current === 'light') next = 'dark';
		else next = 'system';

		themeStore.setTheme(next);
	}
</script>

<button
	class="theme-toggle"
	onclick={cycleTheme}
	aria-label={$LL.theme.toggle()}
	title={$LL.theme.current(themeLabels[themeStore.theme])}
>
	<div class="icon-container">
		{#if themeStore.theme === 'light'}
			<div in:scale={{ duration: 200 }} out:scale={{ duration: 200 }} class="icon">
				<Sun size={20} weight="bold" />
			</div>
		{:else if themeStore.theme === 'dark'}
			<div in:scale={{ duration: 200 }} out:scale={{ duration: 200 }} class="icon">
				<Moon size={20} weight="bold" />
			</div>
		{:else}
			<div in:scale={{ duration: 200 }} out:scale={{ duration: 200 }} class="icon">
				<Desktop size={20} weight="bold" />
			</div>
		{/if}
	</div>
</button>

<style>
	.theme-toggle {
		background: none;
		border: none;
		cursor: pointer;
		padding: 8px;
		border-radius: 50%;
		color: var(--text-color);
		transition:
			background-color 0.2s,
			color 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
	}

	.theme-toggle:hover {
		background-color: rgba(var(--primary-color-rgb), 0.15);
		color: var(--primary-color);
	}

	.icon-container {
		position: relative;
		width: 20px;
		height: 20px;
	}

	.icon {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
