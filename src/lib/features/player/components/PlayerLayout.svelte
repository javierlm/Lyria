<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import Logo from '$lib/features/ui/components/Logo.svelte';
  import SearchBar from '$lib/features/search/components/SearchBar.svelte';
  import PlayerView from '$lib/features/player/components/PlayerView.svelte';
  import TimingControls from '$lib/features/player/components/TimingControls.svelte';
  import LyricsView from '$lib/features/player/components/LyricsView.svelte';
  import LikeButton from '$lib/features/video/components/LikeButton.svelte';
  import MobilePlayerLayout from '$lib/features/player/components/MobilePlayerLayout.svelte';
  import CaretLeft from 'phosphor-svelte/lib/CaretLeft';
  import Copy from 'phosphor-svelte/lib/Copy';
  import Check from 'phosphor-svelte/lib/Check';
  import ListBulletsIcon from 'phosphor-svelte/lib/ListBulletsIcon';
  import SquareSplitHorizontalIcon from 'phosphor-svelte/lib/SquareSplitHorizontalIcon';
  import SquareSplitVerticalIcon from 'phosphor-svelte/lib/SquareSplitVerticalIcon';
  import LL from '$i18n/i18n-svelte';
  import BackToTop from '$lib/features/ui/components/BackToTop.svelte';

  import { isFavoritesLimitError } from '$lib/features/video/domain/videoRepositoryErrors';
  import { videoService } from '$lib/features/video/services/videoService';
  import { notify } from '$lib/features/notification';

  function detectCoarsePointer(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.matchMedia('(pointer: coarse)').matches;
  }

  let windowWidth = $state(0);
  let windowHeight = $state(0);
  let isCoarsePointer = $state(detectCoarsePointer());

  const MOBILE_LAYOUT_MAX_SMALLEST_SIDE = 768;

  // Keep the mobile layout stable across rotations by classifying mobile devices
  // using the smallest viewport side instead of the current orientation.
  const isMobileLayout = $derived(
    isCoarsePointer &&
      windowWidth > 0 &&
      windowHeight > 0 &&
      Math.min(windowWidth, windowHeight) < MOBILE_LAYOUT_MAX_SMALLEST_SIDE
  );

  const iconSize = $derived(windowWidth > 768 ? 24 : 16);

  let copied = $state(false);
  let isFavorite = $state(false);
  let notifiedHorizontalModeForVideo: string | null = null;
  let notifiedLyricVideoForVideo: string | null = null;

  const showHorizontalLayout = $derived(
    playerState.lyricsState === 'found' &&
      !playerState.isLoadingVideo &&
      playerState.duration > 0 &&
      windowWidth >= 1400 &&
      (playerState.forceHorizontalMode || !playerState.lyricsAreSynced)
  );

  $effect(() => {
    if (playerState.videoId) {
      checkFavoriteStatus(playerState.videoId);
    }
  });

  // Show notification when horizontal mode is auto-activated due to unsynced lyrics
  $effect(() => {
    if (
      playerState.videoId &&
      showHorizontalLayout &&
      !playerState.lyricsAreSynced &&
      playerState.lyricsState === 'found' &&
      !playerState.forceHorizontalMode &&
      notifiedHorizontalModeForVideo !== playerState.videoId
    ) {
      notifiedHorizontalModeForVideo = playerState.videoId;
      notify.info(
        $LL.notifications.horizontalModeAutoActivated(),
        $LL.notifications.unsyncedLyricsHorizontalMode()
      );
    }
  });
  $effect(() => {
    if (
      playerState.videoId &&
      playerState.lyricsState === 'found' &&
      playerState.isLyricVideo &&
      !playerState.showOriginalSubtitle &&
      notifiedLyricVideoForVideo !== playerState.videoId
    ) {
      notifiedLyricVideoForVideo = playerState.videoId;
      notify.info(
        $LL.notifications.lyricVideoDetected(),
        $LL.notifications.lyricVideoDetectedMessage()
      );
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
        notify.favoriteRemoved($LL.notifications.removedFromFavorites(), '');
      } else {
        await videoService.addFavoriteVideo(videoId);
        notify.favoriteAdded($LL.notifications.addedToFavorites(), '');
      }
    } catch (error) {
      if (isFavoritesLimitError(error)) {
        notify.warning(
          $LL.notifications.favoriteLimitReached(),
          $LL.notifications.favoriteLimitReachedMessage()
        );
      } else {
        notify.error($LL.notifications.favoriteError(), $LL.notifications.favoriteErrorMessage());
      }

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
        notify.success($LL.notifications.urlCopied(), '');
      })
      .catch((err) => {
        notify.error($LL.notifications.urlCopyError(), $LL.notifications.urlCopyErrorMessage());
        console.error('Error copying URL:', err);
      });
  }

  function goToHome() {
    goto(resolve('/'));
  }

  onMount(() => {
    const coarsePointerMediaQuery = window.matchMedia('(pointer: coarse)');

    const syncCoarsePointer = () => {
      isCoarsePointer = coarsePointerMediaQuery.matches;
    };

    syncCoarsePointer();
    coarsePointerMediaQuery.addEventListener('change', syncCoarsePointer);

    return () => {
      coarsePointerMediaQuery.removeEventListener('change', syncCoarsePointer);
    };
  });
</script>

<svelte:window bind:innerWidth={windowWidth} bind:innerHeight={windowHeight} />
<div
  class="player-layout-root"
  class:mobile-layout-root={isMobileLayout}
  class:main-content-wrapper={!isMobileLayout}
  class:horizontal-mode={!isMobileLayout && showHorizontalLayout}
>
  {#if isMobileLayout}
    <SearchBar />

    <div class="top-logo-container">
      <button
        class="top-nav-button"
        onclick={goToHome}
        aria-label={$LL.videoError.goBack()}
        title={$LL.videoError.goBack()}
      >
        <CaretLeft size={20} weight="bold" />
      </button>

      <div class="top-logo">
        <Logo isPlayerView={true} />
      </div>
    </div>
  {:else}
    <div class="logo-container-main">
      <Logo isPlayerView={true} />
    </div>
    <SearchBar />

    <div class="title-container">
      <h1>
        {#if playerState.artist && playerState.track}
          {#if playerState.artist === playerState.track}
            {playerState.artist}
          {:else}
            {playerState.artist} - {playerState.track}
          {/if}
        {:else if playerState.track}
          {playerState.track}
        {:else if playerState.artist}
          {playerState.artist}
        {:else}
          &nbsp;
        {/if}
      </h1>
      {#if playerState.artist || playerState.track}
        <LikeButton isLiked={isFavorite} onclick={toggleFavorite} size={iconSize} />
        <button
          onclick={copyURL}
          class="action-button copy-button"
          aria-label={$LL.controls.copyUrl()}
          title={$LL.controls.copyUrl()}
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
          aria-label={$LL.controls.selectLyrics()}
          title={$LL.controls.selectLyrics()}
        >
          <ListBulletsIcon size={iconSize} />
        </button>
        {#if windowWidth >= 1400}
          <button
            disabled={!playerState.lyricsAreSynced}
            onclick={() => {
              playerState.forceHorizontalMode = !playerState.forceHorizontalMode;
            }}
            class="action-button horizontal-mode-button"
            class:active={playerState.forceHorizontalMode}
            aria-label={playerState.forceHorizontalMode
              ? $LL.controls.exitHorizontalMode()
              : $LL.controls.enterHorizontalMode()}
            title={playerState.forceHorizontalMode
              ? $LL.controls.exitHorizontalMode()
              : $LL.controls.enterHorizontalMode()}
          >
            {#if playerState.forceHorizontalMode}
              <SquareSplitVerticalIcon size={iconSize} />
            {:else}
              <SquareSplitHorizontalIcon size={iconSize} />
            {/if}
          </button>
        {/if}
      {/if}
    </div>
  {/if}

  <div id="scroll-sentinel" style="height: 1px;"></div>

  <div
    class="player-content"
    class:horizontal={!isMobileLayout && showHorizontalLayout}
    class:mobile-player-content={isMobileLayout}
  >
    <div class="video-wrapper" class:mobile-video-wrapper={isMobileLayout}>
      <PlayerView />
      <div class="timing-controls-container" class:mobile-timing-controls={isMobileLayout}>
        <TimingControls layout={isMobileLayout ? 'row' : 'column'} />
      </div>
    </div>

    {#if isMobileLayout}
      <MobilePlayerLayout
        showSearch={false}
        showHeader={false}
        showPlayer={false}
        showTimingControls={false}
      />
    {:else}
      <LyricsView />
    {/if}
  </div>

  {#if !isMobileLayout}
    <BackToTop />
  {/if}
</div>

<style>
  .player-layout-root {
    width: 100%;
  }

  .player-layout-root.mobile-layout-root {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background-color: var(--background-color);
  }

  .logo-container-main {
    display: flex;
    justify-content: center;
    margin-bottom: 0.5rem;
    transform: scale(0.6);
  }

  .main-content-wrapper {
    max-width: clamp(1200px, 90vw, 1600px);
    margin: 0 auto;
    padding: 0 1rem;
    overflow-x: hidden;
  }

  .main-content-wrapper.horizontal-mode {
    max-width: clamp(1500px, 98vw, 2000px);
    padding: 0 0.5rem;
  }

  .top-logo-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 0;
    margin-top: 0.5rem;
    height: 35px;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
  }

  .top-nav-button {
    position: absolute;
    left: 1rem;
    top: calc(50% - 8px);
    display: grid;
    place-items: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background-color: color-mix(in srgb, var(--card-background) 88%, transparent);
    color: var(--text-color);
    cursor: pointer;
    transform: translateY(-50%);
    transition:
      background-color var(--theme-transition-duration) var(--theme-transition-timing),
      border-color var(--theme-transition-duration) var(--theme-transition-timing),
      transform 0.2s ease;
  }

  .top-nav-button:hover {
    background-color: rgba(var(--primary-color-rgb), 0.12);
  }

  .top-nav-button:active {
    transform: translateY(-50%) scale(0.96);
  }

  .top-logo {
    transform: scale(0.3);
    transform-origin: center top;
    margin-top: -16px;
  }

  @media (min-width: 2561px) {
    .main-content-wrapper {
      max-width: clamp(1600px, 90vw, 2000px);
    }

    .main-content-wrapper.horizontal-mode {
      max-width: clamp(2000px, 98vw, 2800px);
      padding: 0 0.5rem;
    }
  }

  .title-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .player-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mobile-player-content {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .video-wrapper,
  :global(.lyrics-container) {
    width: 100%;
    max-width: clamp(800px, calc(46.875vw), 1200px);
    margin: 0 auto;
    box-sizing: border-box;
  }

  @media (min-width: 2561px) {
    .video-wrapper,
    :global(.lyrics-container) {
      max-width: clamp(1200px, calc(52.083vw), 2000px);
    }
  }

  .video-wrapper {
    margin-bottom: 1rem;
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .mobile-video-wrapper {
    width: 100%;
    max-width: none;
    margin-bottom: 0;
    padding: 0 1rem;
    margin-top: 0.5rem;
  }

  :global(.lyrics-container) {
    margin-top: 1.5rem;
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .timing-controls-container {
    display: flex;
    justify-content: center;
    margin: 0 auto 0.75rem auto;
    width: 100%;
    max-width: clamp(800px, calc(46.875vw), 1200px);
    box-sizing: border-box;
  }

  .player-content.horizontal .timing-controls-container {
    max-width: 100%;
  }

  .mobile-timing-controls {
    margin-top: 0.5rem;
    padding: 0 0.25rem 0.5rem;
    margin-bottom: 0;
    max-width: none;
  }

  @media (min-width: 2561px) {
    .timing-controls-container {
      max-width: clamp(1200px, calc(52.083vw), 2000px);
    }
  }

  @media (min-width: 1024px) {
    .player-content {
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .player-content.horizontal {
      display: grid;
      grid-template-columns: minmax(900px, 2fr) minmax(400px, 1.2fr);
      grid-template-rows: minmax(0, min-content);
      gap: 1rem;
      align-items: start;
      width: 100%;
      margin: 0 auto;
      padding: 0;
      box-sizing: border-box;
    }

    .player-content > :global(.video-wrapper) {
      transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .player-content.horizontal > :global(.video-wrapper) {
      width: 100%;
      max-width: none;
    }

    .player-content.horizontal > :global(.lyrics-container) {
      height: auto;
      max-height: 100%;
      min-height: 0;
      overflow: hidden;
    }

    @media (min-width: 2561px) {
      .player-content.horizontal {
        grid-template-columns: minmax(1400px, 2fr) minmax(600px, 1.2fr);
        grid-template-rows: minmax(0, min-content);
        gap: 1.5rem;
      }
    }
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

    .mobile-video-wrapper {
      padding: 0 1rem;
      margin-top: 0.75rem;
    }
  }

  .action-button:hover:not(:disabled) {
    background-color: rgba(var(--primary-color-rgb), 0.1);
  }

  .action-button.active {
    background-color: var(--primary-color);
    color: white;
    border-color: var(--primary-color);
  }

  .action-button:disabled {
    cursor: not-allowed;
    opacity: 0.4;
    pointer-events: none;
  }
</style>
