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

	let seekInterval: ReturnType<typeof setInterval> | undefined;
	const SEEK_INTERVAL_MS = 250;
	const SEEK_AMOUNT = 5;

	function startSeeking(direction: 'left' | 'right') {
		if (seekInterval || playerState.isSeeking) return;

		const performSeek = () => {
			if (playerState.isSeeking) return;

			if (direction === 'left') {
				seekTo(Math.max(0, playerState.currentTime - SEEK_AMOUNT));
			} else {
				seekTo(Math.min(playerState.duration, playerState.currentTime + SEEK_AMOUNT));
			}
		};

		performSeek();

		seekInterval = setInterval(performSeek, SEEK_INTERVAL_MS);
	}

	function stopSeeking() {
		if (seekInterval) {
			clearInterval(seekInterval);
			seekInterval = undefined;
		}
	}

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
					if (!event.repeat) {
						startSeeking('left');
					}
					break;
				case 'ArrowRight':
					event.preventDefault();
					if (!event.repeat) {
						startSeeking('right');
					}
					break;
			}
		};

		const handleKeyup = (event: KeyboardEvent) => {
			if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
				return;
			}

			switch (event.code) {
				case 'ArrowLeft':
				case 'ArrowRight':
					stopSeeking();
					break;
			}
		};

		window.addEventListener('keydown', handleKeydown);
		window.addEventListener('keyup', handleKeyup);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			window.removeEventListener('keyup', handleKeyup);
			stopSeeking();
		};
	});
</script>

{#if playerState.videoId}
	<div in:fade={{ duration: 300 }}>
		<PlayerLayout />
	</div>
{:else}
	<div in:fade={{ duration: 300 }}>
		<HomeView />
	</div>
{/if}
