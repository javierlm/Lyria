<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconPlay from 'phosphor-svelte/lib/Play';
	import IconMagnifyingGlass from 'phosphor-svelte/lib/MagnifyingGlass';
	import { videoService } from '$lib/data/videoService';
	import type { RecentVideo } from '$lib/data/IVideoRepository';
	import { extractVideoId, isYouTubeUrl } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { playerState } from '$lib/stores/playerStore.svelte';
	import RecentVideoItem from './RecentVideoItem.svelte';
	import { LL } from '$i18n/i18n-svelte';
	import { animateHeight } from '$lib/actions/animateHeight';

	let { centered = false } = $props<{ centered?: boolean }>();

	let showSearchField = $state(centered);
	let searchContainerRef = $state<HTMLDivElement>();
	let showRecentVideos = $state(false);
	let recentVideos: (RecentVideo & { isFavorite?: boolean; isGhost?: boolean })[] = $state([]);
	let filteredVideos: (RecentVideo & { isFavorite?: boolean; isGhost?: boolean })[] = $state([]);
	let searchValue = $state('');
	let debounceTimer: ReturnType<typeof setTimeout>;
	let ghostVideo: (RecentVideo & { isFavorite?: boolean; isGhost?: boolean }) | null = $state(null);
	let isFetchingGhost = $state(false);
	let dropdownHeightUpdater: (() => void) | null = null;

	const DEBOUNCE_DELAY = 300;

	// Trigger height animation when filtered videos change
	$effect(() => {
		if (dropdownHeightUpdater && filteredVideos.length > 0) {
			setTimeout(() => {
				if (dropdownHeightUpdater) {
					dropdownHeightUpdater();
				}
			}, 320);
		}
	});

	async function fetchVideoInfo(
		videoId: string
	): Promise<{ title: string; author: string } | null> {
		try {
			const response = await fetch(
				`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
			);
			if (!response.ok) return null;
			const data = await response.json();
			return {
				title: data.title || '',
				author: data.author_name || ''
			};
		} catch (error) {
			console.error('Failed to fetch video info:', error);
			return null;
		}
	}

	function autofocus(node: HTMLElement) {
		node.focus();
	}

	function searchVideos(
		query: string
	): (RecentVideo & { isFavorite?: boolean; isGhost?: boolean })[] {
		if (!query.trim() || query.trim().length < 2) {
			return recentVideos;
		}

		const lowerQuery = query.toLowerCase().trim();

		const videoId = extractVideoId(query);
		if (videoId) {
			return recentVideos.filter((video) => video.videoId === videoId);
		}

		const searchTerms = lowerQuery.split(/\s+/).filter((term) => term.length > 0);

		if (searchTerms.length === 0) {
			return recentVideos;
		}

		return recentVideos.filter((video) => {
			const combinedText = `${video.artist?.toLowerCase() || ''} ${video.track?.toLowerCase() || ''}`;

			if (!combinedText.includes(searchTerms[0])) {
				return false;
			}

			for (let i = 1; i < searchTerms.length; i++) {
				if (!combinedText.includes(searchTerms[i])) {
					return false;
				}
			}

			return true;
		});
	}

	function handleSearchInput(event: Event) {
		const input = event.target as HTMLInputElement;
		searchValue = input.value;

		clearTimeout(debounceTimer);
		ghostVideo = null;

		if (!searchValue.trim()) {
			filteredVideos = recentVideos;
			showRecentVideos = recentVideos.length > 0;
			return;
		}

		debounceTimer = setTimeout(async () => {
			filteredVideos = searchVideos(searchValue);

			// Check if it's a YouTube URL and not in results
			const videoId = extractVideoId(searchValue);
			if (videoId && filteredVideos.length === 0 && !isFetchingGhost) {
				isFetchingGhost = true;
				const videoInfo = await fetchVideoInfo(videoId);
				if (videoInfo) {
					const { title, author } = videoInfo;
					const parts = title.split(/[-–—|]/);
					let artist = author;
					let track = title;

					if (parts.length >= 2) {
						artist = parts[0].trim();
						track = parts.slice(1).join('-').trim();
					}

					ghostVideo = {
						videoId,
						artist,
						track,
						timestamp: 0,
						thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
						isFavorite: false,
						isGhost: true
					};
					filteredVideos = [ghostVideo];
				}
				isFetchingGhost = false;
			}

			showRecentVideos = filteredVideos.length > 0 || ghostVideo !== null;
		}, DEBOUNCE_DELAY);
	}

	function loadVideoFromUrl(url: string) {
		const id = extractVideoId(url);
		if (id) {
			const newUrlString = `play?id=${encodeURIComponent(id)}`;
			// eslint-disable-next-line svelte/no-navigation-without-resolve
			goto(newUrlString, { noScroll: true });
			showSearchField = false;
			searchValue = '';
		}
	}

	function handleSubmit(event: Event) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const input = form.elements.namedItem('url') as HTMLInputElement;

		if (filteredVideos.length === 1) {
			const video = filteredVideos[0];
			handleRecentVideoClick(video.videoId);
		} else if (isYouTubeUrl(input.value)) {
			loadVideoFromUrl(input.value);
		} else if (filteredVideos.length > 0) {
			handleRecentVideoClick(filteredVideos[0].videoId);
		}
	}

	function toggleSearchField() {
		showSearchField = !showSearchField;
		if (showSearchField) {
			loadRecentVideos();
		} else {
			showRecentVideos = false;
			searchValue = '';
			ghostVideo = null;
			clearTimeout(debounceTimer);
		}
	}

	async function loadRecentVideos() {
		const [recents, favorites] = await Promise.all([
			videoService.getRecentVideos(),
			videoService.getFavoriteVideos()
		]);

		const videoMap = new Map<string, RecentVideo & { isFavorite?: boolean }>();

		favorites.forEach((fav) => {
			videoMap.set(fav.videoId, { ...fav, isFavorite: true });
		});

		recents.forEach((recent) => {
			const existing = videoMap.get(recent.videoId);
			videoMap.set(recent.videoId, { ...recent, isFavorite: existing?.isFavorite ?? false });
		});

		recentVideos = Array.from(videoMap.values()).sort((a, b) => b.timestamp - a.timestamp);

		if (searchValue.trim()) {
			filteredVideos = searchVideos(searchValue);
			if (filteredVideos.length === 0 && ghostVideo) {
				filteredVideos = [ghostVideo];
			}
			showRecentVideos = filteredVideos.length > 0;
		} else {
			filteredVideos = recentVideos;
			showRecentVideos = recentVideos.length > 0;
		}
	}

	function handleRecentVideoClick(videoId: string) {
		const url = `https://www.youtube.com/watch?v=${videoId}`;
		loadVideoFromUrl(url);
		searchValue = '';
	}

	async function handleDeleteRecentVideo(event: CustomEvent<string>) {
		const videoId = event.detail;
		await videoService.deleteRecentVideo(videoId);
		await loadRecentVideos();

		// Re-aplicar el filtro actual si hay búsqueda activa
		if (searchValue.trim()) {
			filteredVideos = searchVideos(searchValue);
		}
	}

	function handleFocus() {
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
						searchValue = '';
						ghostVideo = null;
					}, 300);
				} else if (showSearchField) {
					showSearchField = false;
					searchValue = '';
					ghostVideo = null;
				}
			}
		};

		document.addEventListener('click', handleClickOutside);

		return () => {
			document.removeEventListener('click', handleClickOutside);
			clearTimeout(debounceTimer);
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
					placeholder={$LL.search.placeholder()}
					use:autofocus
					bind:value={searchValue}
					on:focus={handleFocus}
					on:input={handleSearchInput}
				/>

				<button type="submit">
					<IconPlay size="20" weight="bold" />
					<span class="search-button-text">{$LL.search.loadVideo()}</span>
				</button>
			</form>

			{#if showRecentVideos && filteredVideos.length > 0}
				<div
					class="recent-videos-dropdown"
					in:slide={{ duration: 300 }}
					out:slide={{ duration: 300 }}
					use:animateHeight={{ onUpdate: (update) => (dropdownHeightUpdater = update) }}
				>
					{#each filteredVideos as video (video.videoId)}
						<RecentVideoItem
							{video}
							isFavorite={video.isFavorite}
							on:select={(e) => handleRecentVideoClick(e.detail)}
							on:delete={handleDeleteRecentVideo}
						/>
					{/each}
				</div>
			{:else if searchValue.trim() && filteredVideos.length === 0}
				<div
					class="recent-videos-dropdown no-results"
					in:slide={{ duration: 300 }}
					out:slide={{ duration: 300 }}
					use:animateHeight
				>
					<div class="no-results-message">
						{#if isYouTubeUrl(searchValue)}
							<p>{$LL.search.notInHistory()}</p>
							<p class="hint">{$LL.search.pressEnterToLoad()}</p>
						{:else}
							<p>{$LL.search.noResults()}</p>
							<p class="hint">{$LL.search.searchHint()}</p>
						{/if}
					</div>
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

	.recent-videos-dropdown.no-results {
		max-height: none;
		overflow: visible;
	}

	.no-results-message {
		padding: 2rem;
		text-align: center;
		color: var(--text-secondary);
	}

	.no-results-message p {
		margin: 0.5rem 0;
		font-size: 1rem;
	}

	.no-results-message .hint {
		font-size: 0.875rem;
		opacity: 0.7;
		margin-top: 0.25rem;
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

		.no-results-message {
			padding: 1.5rem;
		}

		.no-results-message p {
			font-size: 0.9rem;
		}

		.no-results-message .hint {
			font-size: 0.8rem;
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

		.no-results-message {
			padding: 1rem;
		}

		.no-results-message p {
			font-size: 0.85rem;
		}

		.no-results-message .hint {
			font-size: 0.75rem;
		}
	}
</style>
