<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import { playerState } from '$lib/stores/playerStore.svelte';
	import { loadVideo, toggleFullscreen, pause, play } from '$lib/actions/playerActions';
	import VideoControls from '$lib/components/VideoControls.svelte';
	import { stopPropagation } from 'svelte/legacy';
	import BackToTop from './BackToTop.svelte';
	import LoadingScreen from './LoadingScreen.svelte';

	let playerContainer: HTMLElement;
	let showControls = $state(false);
	let hideControlsTimeout: ReturnType<typeof setTimeout> | undefined;
	let currentLoadedVideoId: string | null = null;
	let isTouch = $state(false);

	const HIDE_DELAY = 3000;

	function resetHideControlsTimer() {
		if (hideControlsTimeout) {
			clearTimeout(hideControlsTimeout);
			hideControlsTimeout = undefined;
		}
		// Hide controls automatically if video is playing
		if (playerState.isPlaying) {
			hideControlsTimeout = setTimeout(() => {
				showControls = false;
				hideControlsTimeout = undefined;
			}, HIDE_DELAY);
		}
	}

	function showControlsAndResetTimer() {
		showControls = true;
		resetHideControlsTimer();
	}

	function handleContainerClick(e: MouseEvent | TouchEvent) {
		if (isTouch) {
			// Mobile devices
			e.preventDefault();
			if (showControls) {
				showControls = false;
				if (hideControlsTimeout) {
					clearTimeout(hideControlsTimeout);
					hideControlsTimeout = undefined;
				}
			} else {
				showControlsAndResetTimer();
			}
		} else {
			if (playerState.isPlaying) {
				pause();
			} else {
				play();
			}
			showControlsAndResetTimer();
		}
	}

	$effect(() => {
		if (playerState.videoId && playerState.videoId !== currentLoadedVideoId) {
			loadVideo(playerState.videoId, 'player', playerState.timingOffset);
			currentLoadedVideoId = playerState.videoId;
		} else if (!playerState.videoId && currentLoadedVideoId) {
			loadVideo('', 'player');
			currentLoadedVideoId = null;
		}
	});

	$effect(() => {
		if (playerState.isPlaying && showControls) {
			resetHideControlsTimer();
		}
	});

	onMount(() => {
		isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

		const handleFullscreenChange = () => {
			playerState.isFullscreen = !!document.fullscreenElement;
		};

		document.addEventListener('fullscreenchange', handleFullscreenChange);
		document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
		document.addEventListener('mozfullscreenchange', handleFullscreenChange);
		document.addEventListener('MSFullscreenChange', handleFullscreenChange);

		return () => {
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
			document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
			document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
			if (hideControlsTimeout) {
				clearTimeout(hideControlsTimeout);
			}
		};
	});

	function handleToggleFullscreen() {
		toggleFullscreen(playerContainer);
	}
</script>

<div
	bind:this={playerContainer}
	class="player-container"
	class:fullscreen={playerState.isFullscreen}
	role="region"
	onmouseenter={(e) => {
		if (!isTouch) {
			e.stopPropagation();
			showControlsAndResetTimer();
		}
	}}
	onmouseleave={(e) => {
		if (!isTouch) {
			e.stopPropagation();
			resetHideControlsTimer();
		}
	}}
	onmousemove={(e) => {
		if (!isTouch) {
			e.stopPropagation();
			showControlsAndResetTimer();
		}
	}}
	onclick={(e) => {
		const target = e.target as HTMLElement;
		if (
			target === playerContainer ||
			target.id === 'player' ||
			target.classList.contains('subtitles') ||
			target.classList.contains('subtitle-line')
		) {
			e.stopPropagation();
			handleContainerClick(e);
		}
	}}
	ontouchend={(e) => {
		const target = e.target as HTMLElement;
		if (
			target === playerContainer ||
			target.id === 'player' ||
			target.classList.contains('subtitles') ||
			target.classList.contains('subtitle-line')
		) {
			e.stopPropagation();
			e.preventDefault();
			handleContainerClick(e);
		}
	}}
>
	<div id="player"></div>

	{#if playerState.lyricsAreSynced}
		{#key playerState.currentLine}
			<div class="subtitles" in:slide={{ duration: 300 }}>
				{#if playerState.showOriginalSubtitle && playerState.currentLine}
					<div class="subtitle-line">{playerState.currentLine}</div>
				{/if}
				{#if playerState.showTranslatedSubtitle && playerState.currentTranslatedLine}
					<div class="subtitle-line translated-subtitle">{playerState.currentTranslatedLine}</div>
				{/if}
			</div>
		{/key}
	{/if}

	<div
		class="video-controls-wrapper"
		class:show={showControls}
		onclick={(e) => e.stopPropagation()}
		ontouchstart={(e) => e.stopPropagation()}
		onmouseenter={(e) => {
			if (!isTouch) {
				e.stopPropagation();
				if (hideControlsTimeout) {
					clearTimeout(hideControlsTimeout);
				}
			}
		}}
		onmousemove={(e) => {
			if (!isTouch) {
				e.stopPropagation();
				if (hideControlsTimeout) {
					clearTimeout(hideControlsTimeout);
				}
			}
		}}
		onmouseleave={(e) => {
			if (!isTouch) {
				e.stopPropagation();
				resetHideControlsTimer();
			}
		}}
	>
		<VideoControls on:toggleFullscreen={handleToggleFullscreen} />
	</div>
	<BackToTop />

	{#if playerState.isLoadingVideo}
		<LoadingScreen />
	{/if}
</div>

<style>
	.player-container {
		position: relative;
		width: 100%;
		max-width: 100%;
		height: auto;
		aspect-ratio: 16 / 9;
		max-height: 85vh;
		background: black;
		transition: all 0.3s ease-in-out;
		overflow: hidden;
		margin: 0 auto;
		display: block;
	}

	.video-controls-wrapper {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.3s ease-out,
			visibility 0.3s ease-out;
		z-index: 10;
	}

	.video-controls-wrapper.show {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}

	.fullscreen {
		position: fixed !important;
		top: 0;
		left: 0;
		width: 100vw !important;
		height: 100vh !important;
		z-index: 9999;
		max-height: 100vh;
	}

	#player {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		z-index: 0;
		pointer-events: none;
	}

	.subtitles {
		position: absolute;
		bottom: 50px;
		width: 100%;
		text-align: center;
		font-size: 1.4rem;
		color: white;
		text-shadow: 2px 2px 8px black;
		font-family: inter;
		opacity: 0.9;
		pointer-events: none;
		z-index: 2;
	}

	.subtitle-line {
		background-color: rgba(0, 0, 0, 0.5);
		padding: 0.2em 0.5em;
		border-radius: 0.2em;
		margin: 0.5rem auto;
		width: fit-content;
	}

	.translated-subtitle {
		color: #cccccc;
		font-size: 1.2rem;
		margin-top: 0.5rem;
	}

	@media (max-width: 768px) and (orientation: landscape) {
		.subtitles {
			bottom: 5px;
			font-size: 1.2rem;
		}
		.translated-subtitle {
			font-size: 1rem;
		}
	}

	@media (max-width: 768px) and (orientation: portrait) {
		.subtitles {
			bottom: 20px;
			font-size: 0.9rem;
		}
		.translated-subtitle {
			font-size: 0.7rem;
		}
	}
</style>
