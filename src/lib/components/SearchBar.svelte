<script lang="ts">
	import { onMount } from 'svelte';
	import IconMagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import { playerState } from '$lib/stores/playerStore.svelte';
	import { searchStore } from '$lib/stores/searchStore.svelte';
	import SearchForm from './search/SearchForm.svelte';
	import SearchResults from './search/SearchResults.svelte';
	import SearchFilters from './search/SearchFilters.svelte';

	let { centered = false } = $props<{ centered?: boolean }>();

	let searchContainerRef: HTMLDivElement;

	onMount(() => {
		if (centered) {
			searchStore.setCentered(true);
			searchStore.loadRecentVideos();
		}

		const handleClickOutside = (event: MouseEvent) => {
			if (!centered && searchContainerRef && !searchContainerRef.contains(event.target as Node)) {
				if (searchStore.showRecentVideos) {
					searchStore.showRecentVideos = false;
					setTimeout(() => {
						searchStore.reset();
						searchStore.showSearchField = false;
					}, 300);
				} else if (searchStore.showSearchField) {
					searchStore.reset();
					searchStore.showSearchField = false;
				}
			}
		};

		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});
</script>

<div
	class="search-container"
	class:centered
	class:fullscreen={playerState.isFullscreen}
	bind:this={searchContainerRef}
>
	{#if !centered}
		<button class="search-icon-button" onclick={() => searchStore.toggleSearchField()}>
			<IconMagnifyingGlass size="24" weight="bold" />
		</button>
	{/if}

	{#if searchStore.showSearchField}
		<div class="search-form-wrapper" class:centered>
			<SearchForm {centered} />
			<SearchFilters />
			<SearchResults />
		</div>
	{/if}
</div>

<style>
	.search-container {
		position: fixed;
		top: 1rem;
		right: 1rem;
		display: flex;
		align-items: center;
		z-index: 1000;
		width: auto;
		gap: 1rem;
		transition: opacity 0.3s ease;
	}

	.search-container.fullscreen {
		position: absolute;
	}

	.search-container.centered {
		position: static;
		top: auto;
		right: auto;
		left: auto;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		box-sizing: border-box;
		transition: none;
	}

	.search-icon-button {
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		border: none;
		border-radius: 50%;
		width: 48px;
		height: 48px;
		display: flex;
		justify-content: center;
		align-items: center;
		cursor: pointer;
		box-shadow: 0 4px 10px var(--button-shadow-color);
		color: white;
		transition: all 0.3s ease;
		flex-shrink: 0;
		outline: none;
	}

	.search-form-wrapper {
		position: relative;
		flex-grow: 1;
		width: 100%;
	}

	.search-form-wrapper:not(.centered) {
		width: 600px;
	}

	.search-form-wrapper.centered {
		max-width: 800px;
		margin: 0 auto;
	}

	@media (max-width: 768px) {
		.search-container {
			right: 0.5rem;
			left: auto;
			width: auto;
		}

		.search-form-wrapper:not(.centered) {
			width: auto;
		}
	}

	@media (max-width: 480px) {
		.search-container {
			top: 0.5rem;
		}

		.search-icon-button {
			width: 40px;
			height: 40px;
		}

		.search-icon-button :global(svg) {
			width: 20px;
			height: 20px;
		}
	}
</style>
