<script lang="ts">
	import { fade } from 'svelte/transition';
	import { playerState, LyricsStates } from '$lib/stores/playerStore.svelte';
	import { play } from '$lib/actions/playerActions';
	import IconPlay from 'phosphor-svelte/lib/Play';
	import LL from '$i18n/i18n-svelte';

	let phrase = $derived.by(() => {
		playerState.videoId;

		if (!$LL || !$LL.loadingPhrases) {
			return 'Loading...';
		}

		const phrasesObj = $LL.loadingPhrases;
		const phraseFuncs = Object.values(phrasesObj);

		if (phraseFuncs.length === 0) {
			return $LL.controls.loading();
		}

		const randomFunc = phraseFuncs[Math.floor(Math.random() * phraseFuncs.length)];
		return randomFunc();
	});
	let showPlayButton = $state(false);
	let timeoutId: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (playerState.isLoadingVideo) {
			const lyricsReady =
				playerState.lyricsState === LyricsStates.Found ||
				playerState.lyricsState === LyricsStates.NotFound;

			if (lyricsReady) {
				if (!timeoutId && !showPlayButton) {
					timeoutId = setTimeout(() => {
						showPlayButton = true;
					}, 1000);
				}
			} else {
				showPlayButton = false;
				if (timeoutId) {
					clearTimeout(timeoutId);
					timeoutId = undefined;
				}
			}
		}

		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	});

	function handleInteraction() {
		play();
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="loading-screen" out:fade={{ duration: 300 }} onclick={handleInteraction}>
	{#if playerState.videoId}
		<div
			class="background-image"
			style="background-image: url('https://img.youtube.com/vi/{playerState.videoId}/maxresdefault.jpg')"
		></div>
		<div class="overlay"></div>
	{/if}
	<div class="content">
		{#if showPlayButton}
			<div class="play-button" in:fade>
				<IconPlay size="48" weight="fill" />
			</div>
			<p class="phrase">{$LL.controls.clickToStart()}</p>
		{:else}
			<div class="spinner"></div>
			<p class="phrase">{phrase}</p>
		{/if}
	</div>
</div>

<style>
	.loading-screen {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: #000;
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 20;
		pointer-events: auto;
	}

	.content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		text-align: center;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.1);
		border-left-color: #fff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.phrase {
		color: white;
		font-family: 'Inter', sans-serif;
		font-size: 1.2rem;
		font-weight: 500;
		opacity: 0.9;
		max-width: 80%;
		line-height: 1;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	@media (max-width: 768px) {
		.content {
			padding: 1rem;
			gap: 1rem;
			width: 90%;
		}

		.phrase {
			font-size: 0.9rem;
			max-width: 100%;
			margin-top: 0rem;
		}

		.spinner {
			width: 30px;
			height: 30px;
			border-width: 3px;
			margin-bottom: 0rem;
		}
	}

	.play-button {
		color: white;
		margin-bottom: 1rem;
		animation: pulse 2s infinite;
	}

	.background-image {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-size: cover;
		background-position: center;
		z-index: 1;
	}

	.overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: rgba(0, 0, 0, 0.4);
		z-index: 2;
	}

	.content {
		z-index: 3;
	}

	@keyframes pulse {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			transform: scale(1.1);
			opacity: 0.8;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
