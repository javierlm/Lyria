<script lang="ts">
  import type { RecentVideo } from '$lib/features/video/domain/IVideoRepository';
  import VideoItem from './VideoItem.svelte';
  import IconX from 'phosphor-svelte/lib/X';
  import { createEventDispatcher, onMount } from 'svelte';
  import { swipe } from '$lib/features/ui/actions/swipe';

  type Props = {
    video: RecentVideo & { isGhost?: boolean };
    isFavorite?: boolean;
    priority?: boolean;
  };

  let { video, isFavorite = false, priority = false }: Props = $props();

  const dispatch = createEventDispatcher<{
    delete: string;
    select: string;
  }>();

  let translateX = $state(0);
  const deleteThreshold = -80;

  let isTouchDevice = $state(false);
  let isMobile = $state(false);

  onMount(() => {
    // Detect touch capability
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    // Also consider mobile screen sizes as touch devices
    const isSmallScreen = window.innerWidth <= 768;
    isTouchDevice = hasTouch || isSmallScreen;
    isMobile = isSmallScreen;

    // Update on resize
    const handleResize = () => {
      const smallScreen = window.innerWidth <= 768;
      isTouchDevice = hasTouch || smallScreen;
      isMobile = smallScreen;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  });

  function onSwipe(event: CustomEvent<{ dx: number }>) {
    if (video.isGhost) return;
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

<div
  class="swipe-container"
  class:is-touch={isTouchDevice}
  class:is-not-touch={!isTouchDevice}
  use:swipe={{ onSwipe, onSwipeEnd }}
>
  <div class="swipe-content" style="transform: translateX({translateX}px)">
    <button class="recent-video-item" onclick={handleSelect} tabindex="0">
      <VideoItem {video} {isFavorite} isGhost={video.isGhost} {priority}>
        {#snippet children()}
          {#if !video.isGhost}
            <div class="desktop-delete-action">
              <button class="delete-button" onclick={handleDelete} aria-label="Delete video">
                <IconX size="20" weight="bold" />
              </button>
            </div>
          {/if}
        {/snippet}
      </VideoItem>
    </button>
  </div>

  {#if !video.isGhost}
    <div class="mobile-delete-action">
      <button class="delete-button" onclick={handleDelete} aria-label="Delete video">
        <IconX size="20" weight="bold" />
      </button>
    </div>
  {/if}
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

  /* Desktop (non-touch): show delete icon, hide swipe */
  .is-not-touch .desktop-delete-action {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .is-not-touch .desktop-delete-action .delete-button {
    background-color: transparent;
    color: var(--text-color);
    margin: 0 20px;
    transition:
      background-color 0.3s ease-in-out,
      color 0.3s ease-in-out;
  }

  .is-not-touch .desktop-delete-action .delete-button:hover {
    background-color: var(--primary-color);
    color: white;
  }

  .is-not-touch .mobile-delete-action {
    display: none;
  }

  /* Touch devices: hide delete icon, enable swipe */
  .is-touch .desktop-delete-action {
    display: none;
  }

  .is-touch .mobile-delete-action {
    position: absolute;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 80px;
    height: 80px;
    aspect-ratio: 1;
    background-color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 0;
    border-radius: 8px;
  }

  .is-touch .mobile-delete-action .delete-button {
    background-color: transparent;
    color: white;
    margin: 0;
    flex-shrink: 0;
  }
</style>
