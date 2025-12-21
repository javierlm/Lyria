<script lang="ts">
	import { playerState } from '$lib/features/player/stores/playerStore.svelte';
	import Logo from '$lib/features/ui/components/Logo.svelte';
	import SearchBar from '$lib/features/search/components/SearchBar.svelte';
	import PlayerView from '$lib/features/player/components/PlayerView.svelte';
	import TimingControls from '$lib/features/player/components/TimingControls.svelte';
	import LyricsView from '$lib/features/player/components/LyricsView.svelte';
	import LikeButton from '$lib/features/video/components/LikeButton.svelte';
	import Copy from 'phosphor-svelte/lib/Copy';
	import Check from 'phosphor-svelte/lib/Check';
	import ListBullets from 'phosphor-svelte/lib/ListBullets';
	import LL from '$i18n/i18n-svelte';
	import BackToTop from '$lib/features/ui/components/BackToTop.svelte';

	import { videoService } from '$lib/features/video/services/videoService';

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
	<SearchBar />

	<div class="title-container">
		<h1>{playerState.artist ? `${playerState.artist} - ${playerState.track}` : '\u00A0'}</h1>
		{#if playerState.artist && playerState.track}
			<LikeButton isLiked={isFavorite} onclick={toggleFavorite} size={iconSize} />
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
			<button
				onclick={() => {
					playerState.isLyricSelectorOpen = true;
				}}
				class="action-button list-button"
				aria-label="Select Lyrics"
			>
				<ListBullets size={iconSize} />
			</button>
		{/if}
	</div>

	<div id="scroll-sentinel" style="height: 1px;"></div>

	<PlayerView />

	<div class="timing-controls-container">
		<TimingControls />
	</div>

	<LyricsView />

	<BackToTop />
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
		background-color: var(--card-background);
		border: 1px solid var(--border-color);
		color: var(--text-color);
		cursor: pointer;
		padding: 0.5rem;
		border-radius: 50%;
		display: grid;
		place-items: center;
		transition: background-color 0.2s;
	}

	@media (max-width: 768px) and (orientation: portrait) {
		.logo-container-main {
			margin-top: 2.5rem;
		}

		.title-container {
			font-size: 0.5rem;
		}

		.action-button {
			font-size: 0.5rem;
		}
	}

	.action-button:hover {
		background-color: rgba(var(--primary-color-rgb), 0.1);
	}

	.timing-controls-container {
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}
</style>
