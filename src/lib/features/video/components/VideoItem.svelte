<script lang="ts">
	import type { RecentVideo } from '$lib/features/video/domain/IVideoRepository';
	import IconClock from 'phosphor-svelte/lib/Clock';
	import IconHeart from 'phosphor-svelte/lib/Heart';
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import LL from '$i18n/i18n-svelte';

	type Props = {
		video: RecentVideo & { isGhost?: boolean };
		isFavorite?: boolean;
		isGhost?: boolean;
		priority?: boolean;
		children?: Snippet;
	};

	let { video, isFavorite = false, isGhost = false, priority = false, children }: Props = $props();

	function formatTimeAgo(timestamp: number): string {
		const now = Date.now();
		const seconds = Math.floor((now - timestamp) / 1000);

		if (seconds < 60) {
			return $LL.time.secondsAgo(seconds);
		}

		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) {
			return $LL.time.minutesAgo(minutes);
		}

		const hours = Math.floor(minutes / 60);
		if (hours < 24) {
			return $LL.time.hoursAgo(hours);
		}

		const days = Math.floor(hours / 24);
		if (days < 7) {
			return $LL.time.daysAgo(days);
		}

		const weeks = Math.floor(days / 7);
		if (weeks < 4) {
			return $LL.time.weeksAgo(weeks);
		}

		const months = Math.max(1, Math.floor(days / 30));
		if (months < 12) {
			return $LL.time.monthsAgo(months);
		}

		const years = Math.floor(days / 365);
		return $LL.time.yearsAgo(years);
	}
</script>

<div class="video-item" class:favorite={isFavorite} transition:fly={{ x: 100, duration: 300 }}>
	{#if video.thumbnailUrl}
		<img
			src={video.thumbnailUrl}
			alt={video.track}
			class="video-thumbnail"
			fetchpriority={priority ? 'high' : 'auto'}
			loading={priority ? 'eager' : 'lazy'}
		/>
	{/if}
	<div class="video-details">
		<div class="video-info">
			<span class="video-artist">{video.artist}</span> -
			<span class="video-track">{video.track}</span>
		</div>

		<div class="video-meta">
			{#if isGhost}
				<div class="video-new-badge">
					<span>{$LL.video.unplayed()}</span>
				</div>
			{:else}
				<div class="video-time-ago">
					<IconClock size="16" weight="bold" />
					<span>{formatTimeAgo(video.timestamp)}</span>
				</div>
			{/if}
			{#if isFavorite}
				<div class="video-favorite">
					<IconHeart size="20" weight="fill" color="var(--primary-color)" />
				</div>
			{/if}
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
		padding: 0.5rem 1rem;
		text-align: left;
		background: none;
		border: none;
		border-bottom: 1px solid var(--border-color);
		border-left: 3px solid transparent;
		font-size: 1rem;
		color: var(--text-color);
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
		overflow: hidden;
		gap: 1rem;
		min-height: 88px;
	}

	.video-item.favorite {
		background-color: rgba(var(--primary-color-rgb), 0.15);
	}

	.video-item:last-child {
		border-bottom: none;
	}

	.video-item:hover {
		background-color: rgba(var(--primary-color-rgb), 0.03);
		border-left-color: var(--text-color);
	}

	.video-thumbnail {
		width: 128px;
		height: 72px;
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

	.video-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.video-time-ago {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-color);
		opacity: 0.7;
		font-size: 0.875rem;
		flex-shrink: 0;
	}

	.video-new-badge {
		display: flex;
		align-items: center;
		padding: 0.25rem 0.5rem;
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		color: white;
		font-size: 0.75rem;
		font-weight: 600;
		border-radius: 0.25rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.video-favorite {
		display: flex;
		align-items: center;
		color: var(--primary-color);
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
			padding: 0.5rem 0.75rem;
			flex-wrap: nowrap;
			gap: 0.75rem;
			min-height: 64px;
		}

		.video-info {
			font-size: 0.85rem;
		}

		.video-time-ago {
			font-size: 0.75rem;
		}

		.video-thumbnail {
			width: 86px;
			height: 48px;
			margin-right: 0.5rem;
		}
	}

	@media (max-width: 480px) {
		.video-item {
			min-height: 58px;
			padding: 0.25rem 0.75rem;
		}

		.video-thumbnail {
			width: 89px;
			height: 50px;
		}

		.video-info {
			font-size: 0.75rem;
		}

		.video-time-ago {
			font-size: 0.7rem;
		}
	}
</style>
