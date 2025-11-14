<script lang="ts">
	import type { RecentVideo } from '$lib/data/IVideoRepository';
	import IconClock from 'phosphor-svelte/lib/Clock';
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	type Props = {
		video: RecentVideo;
		children?: Snippet;
	};

	let { video, children }: Props = $props();

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
</script>

<div class="video-item" transition:fly={{ x: 100, duration: 300 }}>
	{#if video.thumbnailUrl}
		<img src={video.thumbnailUrl} alt={video.track} class="video-thumbnail" />
	{/if}
	<div class="video-details">
		<div class="video-info">
			<span class="video-artist">{video.artist}</span> -
			<span class="video-track">{video.track}</span>
		</div>

		<div class="video-time-ago">
			<IconClock size="16" weight="bold" />
			<span>{formatTimeAgo(video.timestamp)}</span>
		</div>
	</div>
	<div class="video-actions">
		{#if children}
			{@render children()}
		{/if}
	</div>
</div>

<style>
	.video-item {
		display: flex;
		align-items: center;
		width: 100%;
		padding: 1rem;
		text-align: left;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-color);
		font-size: 1rem;
		color: var(--text-color);
		transition: background-color 0.2s ease;
		overflow: hidden;
		gap: 1rem;
	}

	.video-item:last-child {
		border-bottom: none;
	}

	.video-item:hover {
		background-color: #f3f4f6;
	}

	.video-thumbnail {
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

	.video-artist {
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

	.video-actions {
		margin-left: auto;
		display: flex;
		align-items: center;
	}

	.video-actions :global(button) {
		visibility: hidden;
		opacity: 0;
		transition:
			opacity 0.2s ease,
			visibility 0.2s ease;
	}

	@media (hover: hover) {
		.video-item:hover .video-actions :global(button) {
			visibility: visible;
			opacity: 1;
		}
	}

	@media (max-width: 768px) {
		.video-item {
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

		.video-thumbnail {
			width: 70px;
			height: 39.375px;
			margin-right: 0.5rem;
		}
	}

	@media (max-width: 480px) {
		.video-thumbnail {
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
