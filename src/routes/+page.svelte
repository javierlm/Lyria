<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { playerState } from '$lib/stores/playerStore.svelte';
	import { extractVideoId } from '$lib/utils';
	import { play, pause, seekTo } from '$lib/actions/playerActions';
	import HomeView from '$lib/components/HomeView.svelte';
	import PlayerLayout from '$lib/components/PlayerLayout.svelte';

	let { data } = $props();

	playerState.videoId = data.videoId;
	playerState.timingOffset = data.offset;

	$effect(() => {
		const urlParam = $page.url.searchParams.get('url');
		const newVideoId = urlParam ? extractVideoId(urlParam) : null;

		if (newVideoId !== playerState.videoId) {
			const offsetParam = $page.url.searchParams.get('offset');
			const newOffset = offsetParam ? parseInt(offsetParam, 10) : 0;

			playerState.videoId = newVideoId;
			playerState.timingOffset = isNaN(newOffset) ? 0 : newOffset;
		}
	});

	onMount(() => {
		const handleKeydown = (event: KeyboardEvent) => {
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (event.code) {
				case 'Space':
					event.preventDefault();
					if (playerState.isPlaying) {
						pause();
					} else {
						play();
					}
					break;
				case 'ArrowLeft':
					event.preventDefault();
					seekTo(Math.max(0, playerState.currentTime - 5));
					break;
				case 'ArrowRight':
					event.preventDefault();
					seekTo(Math.min(playerState.duration, playerState.currentTime + 5));
					break;
			}
		};

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	});
</script>

<main>
	{#if playerState.videoId}
		<div in:fade={{ duration: 300 }}>
			<PlayerLayout />
		</div>
	{:else}
		<div in:fade={{ duration: 300 }}>
			<HomeView />
		</div>
	{/if}
</main>

<style>
	main {
		width: 100%;
	}
</style>
