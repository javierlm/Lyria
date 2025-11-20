<script lang="ts">
	import type { RecentVideo } from '$lib/data/IVideoRepository';
	import VideoItem from './VideoItem.svelte';
	import IconX from 'phosphor-svelte/lib/X';
	import { createEventDispatcher } from 'svelte';
	import { swipe } from '$lib/actions/swipe';

	type Props = {
		video: RecentVideo;
		isFavorite?: boolean;
	};

	let { video, isFavorite = false }: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: string;
		select: string;
	}>();

	let translateX = $state(0);
	const deleteThreshold = -80;

	function onSwipe(event: CustomEvent<{ dx: number }>) {
		translateX += event.detail.dx;
		// Limit translation
		translateX = Math.max(deleteThreshold * 1.5, Math.min(0, translateX));
	}

	function onSwipeEnd() {
		// Snap to delete position or closed position
		translateX = translateX < deleteThreshold / 2 ? deleteThreshold : 0;
	}

	function handleDelete(event: MouseEvent) {
		event.stopPropagation();
		dispatch('delete', video.videoId);
	}

	function handleSelect() {
		if (translateX !== 0) {
			// Close the swipe if open
			translateX = 0;
			return;
		}
		dispatch('select', video.videoId);
	}
</script>

<div class="swipe-container" use:swipe={{ onSwipe, onSwipeEnd }}>
	<div class="swipe-content" style="transform: translateX({translateX}px)">
		<button class="recent-video-item" onclick={handleSelect} tabindex="0">
			<VideoItem {video} {isFavorite}>
				{#snippet children()}
					<div class="desktop-delete-action">
						<button class="delete-button" onclick={handleDelete} aria-label="Delete video">
							<IconX size="20" weight="bold" />
						</button>
					</div>
				{/snippet}
			</VideoItem>
		</button>
	</div>

	<div class="mobile-delete-action">
		<button class="delete-button" onclick={handleDelete} aria-label="Delete video">
			<IconX size="20" weight="bold" />
		</button>
	</div>
</div>

<style>
	.swipe-container {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.swipe-content {
		display: flex;
		align-items: center;
		transition: transform 0.2s ease-out;
		width: 100%;
		position: relative;
		z-index: 1;
		background-color: var(--card-background);
	}

	.recent-video-item {
		display: contents;
		cursor: pointer;
		width: 100%;
	}

	.delete-button {
		border: none;
		border-radius: 50%;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	@media (hover: hover) {
		.desktop-delete-action {
			display: flex;
			align-items: center;
			justify-content: center;
		}

		.desktop-delete-action .delete-button {
			background-color: transparent;
			color: var(--text-color);
			margin: 0 20px;
			transition:
				background-color 0.3s ease-in-out,
				color 0.3s ease-in-out;
		}

		.desktop-delete-action .delete-button:hover {
			background-color: var(--primary-color);
			color: white;
		}

		.mobile-delete-action {
			display: none;
		}
	}

	@media (hover: none) {
		.desktop-delete-action {
			display: none;
		}

		.mobile-delete-action {
			position: absolute;
			right: 0;
			top: 0;
			height: 100%;
			width: 80px;
			background-color: #ef4444;
			display: flex;
			align-items: center;
			justify-content: center;
			z-index: 0;
		}

		.mobile-delete-action .delete-button {
			background-color: transparent;
			color: white;
			margin: 0;
			flex-shrink: 0;
		}
	}
</style>
