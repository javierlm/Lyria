<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconPlay from 'phosphor-svelte/lib/Play';
	import IconMagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import { videoService } from '$lib/data/videoService';
	import type { RecentVideo } from '$lib/data/IVideoRepository';
	import { extractVideoId } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { playerState } from '$lib/stores/playerStore.svelte';
	import RecentVideoItem from './RecentVideoItem.svelte';

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

	async function handleDeleteRecentVideo(event: CustomEvent<string>) {
		const videoId = event.detail;
		await videoService.deleteRecentVideo(videoId);
		loadRecentVideos();
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
					<IconPlay size="20" weight="bold" /> <span class="search-button-text">Load Video</span>
				</button>
			</form>

			{#if showRecentVideos && recentVideos.length > 0}
				<div
					class="recent-videos-dropdown"
					in:slide={{ duration: 300 }}
					out:slide={{ duration: 300 }}
				>
					{#each recentVideos as video (video.videoId)}
						<RecentVideoItem
							{video}
							on:select={(e) => handleRecentVideoClick(e.detail)}
							on:delete={handleDeleteRecentVideo}
						/>
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
		--row-height: 88.25px;
		--visible-rows: 6;
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		right: 0;
		background-color: var(--card-background);
		border-radius: 0.75rem;
		box-shadow: 0 10px 30px var(--shadow-color);
		max-height: calc(var(--row-height) * var(--visible-rows));
		overflow-y: auto;
		width: 100%;
		transform: translateX(0);
		scrollbar-width: auto;
		scrollbar-color: var(--primary-color) var(--card-background);
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
		.search-container {
			right: 0.5rem;
			left: auto;
			width: auto;
		}

		.search-form-wrapper:not(.centered) {
			width: auto;
		}

		form {
			flex-wrap: nowrap;
			padding: 0.5rem;
		}

		input[type='text'] {
			flex-grow: 1;
			font-size: 0.9rem;
			padding: 0.7rem 0.9rem;
			margin-bottom: 0;
		}

		form button {
			flex-grow: 0;
			justify-content: center;
			padding: 0.7rem 1.2rem;
			font-size: 0.9rem;
		}

		.recent-videos-dropdown {
			--row-height: 65px;
			--visible-rows: 8;
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

		form {
			padding: 0.4rem;
		}

		input[type='text'] {
			font-size: 0.8rem;
			padding: 0.5rem 0.75rem;
		}

		form button {
			font-size: 0.8rem;
			padding: 0.6rem 0.8rem;
		}

		.search-button-text {
			display: none;
		}

		.recent-videos-dropdown {
			--row-height: 59px;
			--visible-rows: 6;
		}

		.recent-video-thumbnail {
			width: 60px;
			height: 33.75px;
		}

		.video-info {
			font-size: 0.75rem;
		}

		.video-time-ago {
			font-size: 0.7rem;
		}
	}
</style>
