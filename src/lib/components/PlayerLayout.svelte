<script lang="ts">
	import { playerState } from '$lib/stores/playerStore.svelte';
	import Logo from '$lib/components/Logo.svelte';
	import SearchInput from '$lib/components/SearchInput.svelte';
	import PlayerView from '$lib/components/PlayerView.svelte';
	import TimingControls from '$lib/components/TimingControls.svelte';
	import LyricsView from '$lib/components/LyricsView.svelte';
	import LikeButton from '$lib/components/LikeButton.svelte';
	import { Copy, Check } from 'phosphor-svelte';
	import LL from '$i18n/i18n-svelte';

	import { videoService } from '$lib/data/videoService';

	let windowWidth = $state(0);
	const iconSize = $derived(windowWidth > 768 ? 24 : 16);

	let copied = $state(false);
	let isFavorite = $state(false);

	$effect(() => {
		if (playerState.videoId) {
			checkFavoriteStatus(playerState.videoId);
		}
	});

	async function checkFavoriteStatus(videoId: string) {
		isFavorite = await videoService.isFavorite(videoId);
	}

	async function toggleFavorite() {
		if (!playerState.videoId || !playerState.artist || !playerState.track) return;

		const videoId = playerState.videoId;
		const wasFavorite = isFavorite;

		isFavorite = !isFavorite;

		try {
			if (wasFavorite) {
				await videoService.removeFavoriteVideo(videoId);
			} else {
				await videoService.addFavoriteVideo(videoId);
			}
		} catch (error) {
			console.error('Error toggling favorite:', error);
			// Rollback
			isFavorite = wasFavorite;
		}
	}

	function copyURL() {
		const url = window.location.href;
		navigator.clipboard
			.writeText(url)
			.then(() => {
				copied = true;
				setTimeout(() => (copied = false), 2000);
			})
			.catch((err) => {
				console.error('Error al copiar la URL:', err);
			});
	}
</script>

<svelte:window bind:innerWidth={windowWidth} />
<div class="main-content-wrapper">
	<div class="logo-container-main">
		<Logo isPlayerView={true} />
	</div>
	<SearchInput />

	<div class="title-container">
		<h1>{playerState.artist ? `${playerState.artist} - ${playerState.track}` : '\u00A0'}</h1>
		{#if playerState.artist && playerState.track}
			<LikeButton isLiked={isFavorite} onclick={toggleFavorite} />
			<button
				onclick={copyURL}
				class="action-button copy-button"
				aria-label={$LL.controls.copyUrl()}
			>
				{#if copied}
					<Check size={iconSize} />
				{:else}
					<Copy size={iconSize} />
				{/if}
			</button>
		{/if}
	</div>

	<div id="scroll-sentinel" style="height: 1px;"></div>

	<PlayerView />

	<div class="timing-controls-container">
		<TimingControls />
	</div>

	<LyricsView />
</div>

<style>
	.logo-container-main {
		display: flex;
		justify-content: center;
		margin-bottom: 0.5rem;
		transform: scale(0.6);
	}

	.main-content-wrapper {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
	}

	.title-container {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.action-button {
		background-color: #f0f0f0;
		border: 1px solid #ccc;
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		transition: background-color 0.2s;
	}

	@media (max-width: 768px) and (orientation: portrait) {
		.title-container {
			font-size: 0.5rem;
		}

		.action-button {
			font-size: 0.5rem;
		}
	}

	.action-button:hover {
		background-color: rgba(0, 0, 0, 0.1);
	}

	.timing-controls-container {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}
</style>
