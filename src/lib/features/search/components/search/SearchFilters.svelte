<script lang="ts">
	import IconHeart from 'phosphor-svelte/lib/Heart';
	import { searchStore } from '$lib/features/search/stores/searchStore.svelte';
	import { slide } from 'svelte/transition';
	import { LL } from '$i18n/i18n-svelte';

	function setFilter(favoritesOnly: boolean) {
		if (searchStore.showOnlyFavorites !== favoritesOnly) {
			searchStore.toggleFavoritesFilter();
		}
	}
</script>

<div class="filters-container" transition:slide={{ duration: 200 }}>
	<button
		class="chip"
		class:active={!searchStore.showOnlyFavorites}
		onclick={() => setFilter(false)}
	>
		{$LL.search.all()}
	</button>
	<button class="chip" class:active={searchStore.showOnlyFavorites} onclick={() => setFilter(true)}>
		<IconHeart size="16" weight={searchStore.showOnlyFavorites ? 'fill' : 'bold'} />
		{$LL.search.favorites()}
	</button>
</div>

<style>
	.filters-container {
		display: flex;
		gap: 0.5rem;
		padding: 0.5rem 0.25rem 0 0.25rem;
		overflow-x: auto;
		scrollbar-width: none; /* Firefox */
	}

	.filters-container::-webkit-scrollbar {
		display: none; /* Chrome, Safari, Opera */
	}

	.chip {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.4rem 0.8rem;
		border-radius: 1rem;
		border: 1px solid var(--border-color);
		background-color: var(--card-background);
		color: var(--text-secondary);
		font-size: 0.85rem;
		cursor: pointer;
		transition:
			transform 0.2s ease,
			opacity 0.2s ease;
		white-space: nowrap;
	}

	.chip:hover {
		background-color: rgba(var(--primary-color-rgb), 0.05);
		border-color: var(--primary-color);
		color: var(--primary-color);
	}

	.chip.active {
		background-color: var(--primary-color);
		color: var(--on-primary-color);
		border-color: var(--primary-color);
	}

	@media (max-width: 480px) {
		.chip {
			padding: 0.35rem 0.7rem;
			font-size: 0.8rem;
		}
	}
</style>
