<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconPlay from 'phosphor-svelte/lib/Play';
	import IconMagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import IconClock from 'phosphor-svelte/lib/Clock';
	import { videoService } from '$lib/data/videoService';
	import type { RecentVideo } from '$lib/data/IVideoRepository';
	import { extractVideoId } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { playerState } from '$lib/stores/playerStore.svelte';

	export let centered = false;

	let showSearchField = centered;
	let searchContainerRef: HTMLDivElement;
	let searchInputRef: HTMLInputElement;
	let showRecentVideos = false;
	let recentVideos: RecentVideo[] = [];

	function autofocus(node: HTMLElement) {
		node.focus();
	}

	function loadVideoFromUrl(url: string) {
		const id = extractVideoId(url);
		if (id) {
			const currentPath = $page.url.pathname;
			const newUrlString = `${currentPath}?url=${encodeURIComponent(url)}`;
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(newUrlString, { noScroll: true });
			showSearchField = false;
		}
	}

	function handleSubmit(event: Event) {
		const form = event.target as HTMLFormElement;
		const input = form.elements.namedItem('url') as HTMLInputElement;
		loadVideoFromUrl(input.value);
	}

	function toggleSearchField() {
		showSearchField = !showSearchField;
		if (showSearchField) {
			loadRecentVideos();
		} else {
			showRecentVideos = false;
		}
	}

	async function loadRecentVideos() {
		recentVideos = await videoService.getRecentVideos();
		showRecentVideos = recentVideos.length > 0;
	}

	function handleRecentVideoClick(videoId: string) {
		const url = `https://www.youtube.com/watch?v=${videoId}`;
		loadVideoFromUrl(url);
	}

	function formatTimeAgo(timestamp: number): string {
		const now = Date.now();
		const seconds = Math.floor((now - timestamp) / 1000);

		if (seconds < 60) {
			return `${seconds} seconds ago`;
		}

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) {
			return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
		}

		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return `${hours} hour${hours === 1 ? '' : 's'} ago`;
		}

		const days = Math.floor(hours / 24);
		if (days < 7) {
			return `${days} day${days === 1 ? '' : 's'} ago`;
		}

		const weeks = Math.floor(days / 7);
		if (weeks < 4) {
			return `${weeks} week${weeks === 1 ? '' : 's'} ago`;
		}

		const months = Math.floor(days / 30);
		if (months < 12) {
			return `${months} month${months === 1 ? '' : 's'} ago`;
		}

		const years = Math.floor(days / 365);
		return `${years} year${years === 1 ? '' : 's'} ago`;
	}

	onMount(() => {
		if (centered) {
			loadRecentVideos();
		}

		const handleClickOutside = (event: MouseEvent) => {
			if (!centered && searchContainerRef && !searchContainerRef.contains(event.target as Node)) {
				if (showRecentVideos) {
					showRecentVideos = false;
					setTimeout(() => {
						showSearchField = false;
					}, 300);
				} else if (showSearchField) {
					showSearchField = false;
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
		<button class="search-icon-button" on:click={toggleSearchField}>
			<IconMagnifyingGlass size="24" weight="bold" />
		</button>
	{/if}

	{#if showSearchField}
		<div class="search-form-wrapper" class:centered>
			<form on:submit|preventDefault={handleSubmit} transition:slide={{ duration: 300 }}>
				<input
					type="text"
					name="url"
					placeholder="Enter YouTube URL"
					use:autofocus
					bind:this={searchInputRef}
					on:focus={loadRecentVideos}
					on:input={() => (showRecentVideos = false)}
				/>

				<button type="submit">
					<IconPlay size="20" weight="bold" /> Load Video
				</button>
			</form>

			{#if showRecentVideos && recentVideos.length > 0}
				<div
					class="recent-videos-dropdown"
					in:slide={{ duration: 300 }}
					out:slide={{ duration: 300 }}
				>
					{#each recentVideos as video (video.videoId)}
						<button
							class="recent-video-item"
							on:click={() => handleRecentVideoClick(video.videoId)}
						>
							{#if video.thumbnailUrl}
								<img src={video.thumbnailUrl} alt={video.track} class="recent-video-thumbnail" />
							{/if}
							<div class="video-details">
								<div class="video-info">
									<span class="recent-video-artist">{video.artist}</span> -
									<span class="recent-video-track">{video.track}</span>
								</div>

								<div class="video-time-ago">
									<IconClock size="16" weight="bold" />
									<span>{formatTimeAgo(video.timestamp)}</span>
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
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

	form {
		display: flex;
		gap: 0.5rem;
		background-color: var(--card-background);
		padding: 0.5rem;
		border-radius: 0.75rem;
		box-shadow: 0 4px 10px var(--button-shadow-color);
		width: 100%;
		box-sizing: border-box;
	}

	.centered form {
		width: 100%;
	}

	input[type='text'] {
		border: 1px solid var(--border-color);
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		flex-grow: 1;
		font-size: 1rem;
		transition: all 0.3s ease;
	}

	input[type='text']:focus {
		outline: none;
		border-color: var(--primary-color);
		box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.2);
	}

	form button {
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		transition: all 0.3s ease;
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

	.recent-videos-dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		background-color: var(--card-background);
		border-radius: 0.75rem;
		box-shadow: 0 10px 30px var(--shadow-color);
		max-height: 535.5px;
		overflow-y: auto;
		width: 100%;
		transform: translateX(0);
		scrollbar-width: auto;
		scrollbar-color: var(--primary-color) var(--card-background);
	}

	.recent-video-item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 1rem;
		text-align: left;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-color);
		cursor: pointer;
		font-size: 1rem;
		color: var(--text-color);
		transition: background-color 0.2s ease;
		overflow: hidden;
		gap: 1rem;
	}

	.recent-video-item:last-child {
		border-bottom: none;
	}

	.recent-video-item:hover {
		background-color: #f3f4f6;
	}

	.recent-video-thumbnail {
		width: 100px;
		height: 56.25px;
		object-fit: cover;
		border-radius: 4px;
		margin-right: 1rem;
		flex-shrink: 0;
	}

	.video-details {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		text-align: left;
		min-width: 0;
		flex-shrink: 1;
	}

	.video-info {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.25rem;
	}

	.recent-video-artist {
		font-weight: 600;
	}

	.video-time-ago {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #6b7280;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.recent-videos-dropdown::-webkit-scrollbar {
		width: 15px;
	}

	.recent-videos-dropdown::-webkit-scrollbar-track {
		background: var(--card-background);
		border-radius: 10px;
	}

	.recent-videos-dropdown::-webkit-scrollbar-thumb {
		background-color: var(--primary-color);
		border-radius: 10px;
		border: 2px solid var(--card-background);
	}

	@media (max-width: 768px) {
		.search-form-wrapper {
			max-width: 100%;
		}

		.recent-videos-dropdown {
			max-height: 500px;
		}

		.recent-video-item {
			padding: 0.75rem;
			flex-wrap: nowrap;
			gap: 0.75rem;
		}

		.video-info {
			font-size: 0.85rem;
		}

		.video-time-ago {
			font-size: 0.75rem;
		}

		.recent-video-thumbnail {
			width: 70px;
			height: 39.375px;
			margin-right: 0.5rem;
		}
	}

	@media (max-width: 480px) {
		.recent-videos-dropdown {
			max-height: 450px;
		}

		.recent-video-thumbnail {
			width: 60px;
			height: 33.75px;
		}

		.video-info {
			font-size: 0.8rem;
		}

		form button {
			padding: 0.75rem 1rem;
			font-size: 0.9rem;
		}

		input[type='text'] {
			font-size: 0.9rem;
			padding: 0.6rem 0.8rem;
		}
	}
</style>
