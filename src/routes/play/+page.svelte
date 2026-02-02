<script lang="ts">
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { play, pause, seekTo } from '$lib/features/player/services/playerActions';
  import PlayerLayout from '$lib/features/player/components/PlayerLayout.svelte';
  import LyricSelector from '$lib/features/player/components/LyricSelector.svelte';

  let { data } = $props();

  $effect(() => {
    const idFromUrl = page.url.searchParams.get('id');
    const offsetParam = page.url.searchParams.get('offset');
    const newOffset = offsetParam ? parseInt(offsetParam, 10) : 0;
    const lyricIdParam = page.url.searchParams.get('lyricId');

    if (idFromUrl !== playerState.videoId) {
      playerState.videoId = idFromUrl;
      playerState.timingOffset = isNaN(newOffset) ? 0 : newOffset;
      playerState.manualLyricId = lyricIdParam ? parseInt(lyricIdParam, 10) : null;
    } else {
      if (lyricIdParam) {
        const currentLyricId = parseInt(lyricIdParam, 10);
        if (currentLyricId !== playerState.manualLyricId) {
          playerState.manualLyricId = currentLyricId;
        }
      }
    }
  });

  // Sync manualLyricId changes to URL (e.g., when loaded from storage)
  $effect(() => {
    // Only run after mount to avoid navigation issues
    if (typeof window === 'undefined') return;

    const currentLyricIdInUrl = page.url.searchParams.get('lyricId');
    const expectedLyricId = playerState.manualLyricId?.toString() || null;

    // Only update if there's a mismatch and we're on the same video
    if (
      currentLyricIdInUrl !== expectedLyricId &&
      playerState.videoId === page.url.searchParams.get('id')
    ) {
      const url = new URL(window.location.href);
      if (playerState.manualLyricId) {
        url.searchParams.set('lyricId', playerState.manualLyricId.toString());
      } else {
        url.searchParams.delete('lyricId');
      }
      // Use replaceState directly on history API to avoid SvelteKit navigation
      window.history.replaceState(window.history.state, '', url.toString());
    }
  });

  let seekInterval: ReturnType<typeof setInterval> | undefined;
  const SEEK_INTERVAL_MS = 250;
  const SEEK_AMOUNT = 5;

  function startSeeking(direction: 'left' | 'right') {
    if (seekInterval || playerState.isSeeking) return;

    const performSeek = () => {
      if (playerState.isSeeking) return;

      if (direction === 'left') {
        seekTo(Math.max(0, playerState.currentTime - SEEK_AMOUNT));
      } else {
        seekTo(Math.min(playerState.duration, playerState.currentTime + SEEK_AMOUNT));
      }
    };

    performSeek();

    seekInterval = setInterval(performSeek, SEEK_INTERVAL_MS);
  }

  function stopSeeking() {
    if (seekInterval) {
      clearInterval(seekInterval);
      seekInterval = undefined;
    }
  }

  onMount(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'Space':
          event.preventDefault();
          if (playerState.isPlaying) {
            pause();
          } else {
            play();
          }
          break;
        case 'ArrowLeft':
          event.preventDefault();
          if (!event.repeat) {
            startSeeking('left');
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (!event.repeat) {
            startSeeking('right');
          }
          break;
      }
    };

    const handleKeyup = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.code) {
        case 'ArrowLeft':
        case 'ArrowRight':
          stopSeeking();
          break;
      }
    };

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      stopSeeking();
    };
  });
</script>

<svelte:head>
  {#if data.videoId}
    {#if data.artist && data.track}
      <meta property="og:title" content="{data.artist} - {data.track}" />
    {:else if data.videoTitle}
      <meta property="og:title" content={data.videoTitle} />
    {:else}
      <meta property="og:title" content="Lyria" />
    {/if}
    <meta property="og:description" content={data.description} />
    <meta property="og:type" content="video.other" />
    <meta name="theme-color" content="#b91c1c" />
    {#if data.thumbnailUrl}
      <meta property="og:image" content={data.thumbnailUrl} />
      <meta name="twitter:image" content={data.thumbnailUrl} />
    {/if}
    <meta name="twitter:card" content="summary_large_image" />
  {/if}
</svelte:head>

{#if playerState.videoId}
  <div in:fade={{ duration: 300 }}>
    <PlayerLayout />
  </div>
  <LyricSelector />
{/if}
