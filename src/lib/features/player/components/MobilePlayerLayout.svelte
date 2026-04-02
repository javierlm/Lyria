<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { seekTo } from '$lib/features/player/services/playerActions';
  import PlayerView from '$lib/features/player/components/PlayerView.svelte';
  import TimingControls from '$lib/features/player/components/TimingControls.svelte';
  import SearchBar from '$lib/features/search/components/SearchBar.svelte';
  import Logo from '$lib/features/ui/components/Logo.svelte';
  import LikeButton from '$lib/features/video/components/LikeButton.svelte';
  import Copy from 'phosphor-svelte/lib/Copy';
  import CaretLeft from 'phosphor-svelte/lib/CaretLeft';
  import Check from 'phosphor-svelte/lib/Check';
  import ListBulletsIcon from 'phosphor-svelte/lib/ListBulletsIcon';
  import EyeIcon from 'phosphor-svelte/lib/Eye';
  import EyeSlashIcon from 'phosphor-svelte/lib/EyeSlash';
  import LanguageSelector from '$lib/features/settings/components/LanguageSelector.svelte';
  import ToggleSwitch from '$lib/features/ui/components/ToggleSwitch.svelte';
  import TextAaIcon from 'phosphor-svelte/lib/TextAa';
  import { videoService } from '$lib/features/video/services/videoService';
  import { notify } from '$lib/features/notification';
  import LL from '$i18n/i18n-svelte';
  import { LyricsStates } from '$lib/features/player/stores/playerStore.svelte';
  import { isTransliterableLanguage } from '$lib/features/settings/stores/transliterationStore.svelte';

  let {
    showSearch = true,
    showHeader = true,
    showPlayer = true,
    showTimingControls = true
  }: {
    showSearch?: boolean;
    showHeader?: boolean;
    showPlayer?: boolean;
    showTimingControls?: boolean;
  } = $props();

  // ── State ──────────────────────────────────────────────────────────────
  let isFavorite = $state(false);
  let lyricsContainer: HTMLDivElement;
  let lyricLineElements: HTMLDivElement[] = $state([]);
  let isAutoScrolling = false;
  let isManualBrowsing = $state(false);
  let autoScrollSettleTimeout: ReturnType<typeof setTimeout> | undefined;

  const shouldShowTransliteration = $derived(
    playerState.transliterationAvailable &&
      playerState.transliterationLang !== null &&
      isTransliterableLanguage(playerState.transliterationLang)
  );

  function handleTransliterationToggle(checked: boolean) {
    playerState.showTransliteration = checked;
  }
  let previousLineIndex = $state(-1);
  let copied = $state(false);

  // ── Derived ────────────────────────────────────────────────────────────
  const adjustedTimes = $derived(
    playerState.lines.map((line) => Math.max(0, line.startTimeMs + playerState.timingOffset))
  );

  function hasVisibleText(index: number): boolean {
    return !!playerState.lines[index]?.text?.trim();
  }

  function findNextVisibleLineIndex(startIndex: number): number {
    for (let i = Math.max(0, startIndex); i < playerState.lines.length; i++) {
      if (hasVisibleText(i)) {
        return i;
      }
    }

    return -1;
  }

  function getUpcomingVisibleLineIndex(): number {
    const currentIndex = playerState.currentLineIndex;

    if (currentIndex >= 0) {
      return findNextVisibleLineIndex(currentIndex + 1);
    }

    const adjustedTime = playerState.currentTime * 1000 - playerState.timingOffset;

    for (let i = 0; i < playerState.lines.length; i++) {
      if (playerState.lines[i].startTimeMs > adjustedTime && hasVisibleText(i)) {
        return i;
      }
    }

    return -1;
  }

  const activeVisibleLineIndex = $derived.by(() => {
    const currentIndex = playerState.currentLineIndex;

    if (currentIndex >= 0 && hasVisibleText(currentIndex)) {
      return currentIndex;
    }

    return -1;
  });

  const upcomingVisibleLineIndex = $derived.by(() => {
    if (activeVisibleLineIndex >= 0 || !playerState.lyricsAreSynced) {
      return -1;
    }

    return getUpcomingVisibleLineIndex();
  });

  const visualTargetLineIndex = $derived.by(() => {
    if (activeVisibleLineIndex >= 0) {
      return activeVisibleLineIndex;
    }

    if (!playerState.lyricsAreSynced) {
      return -1;
    }

    return upcomingVisibleLineIndex;
  });

  const proximityAnchorIndex = $derived.by(() => {
    if (activeVisibleLineIndex >= 0) {
      return activeVisibleLineIndex;
    }

    return upcomingVisibleLineIndex;
  });

  // ── Autoscroll ─────────────────────────────────────────────────────────
  $effect(() => {
    const currentIndex = visualTargetLineIndex;
    if (currentIndex < 0 || currentIndex === previousLineIndex) {
      previousLineIndex = currentIndex;
      return;
    }
    previousLineIndex = currentIndex;
    scrollToLine(currentIndex);
  });

  $effect(() => {
    return () => {
      if (autoScrollSettleTimeout) {
        clearTimeout(autoScrollSettleTimeout);
      }
    };
  });

  function scheduleAutoScrollCompletion() {
    if (autoScrollSettleTimeout) {
      clearTimeout(autoScrollSettleTimeout);
    }

    autoScrollSettleTimeout = setTimeout(() => {
      isAutoScrolling = false;
      isManualBrowsing = false;
      autoScrollSettleTimeout = undefined;
    }, 140);
  }

  function scrollToLine(index: number) {
    const row = lyricLineElements[index];
    const container = lyricsContainer;
    if (!row || !container) return;

    if (autoScrollSettleTimeout) {
      clearTimeout(autoScrollSettleTimeout);
    }

    isAutoScrolling = true;

    const rowRect = row.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const visibleTop = Math.max(containerRect.top, 0);
    const visibleBottom = Math.min(containerRect.bottom, window.innerHeight);
    const visibleCenterInViewport = (visibleTop + visibleBottom) / 2;
    const targetCenterInContainer = visibleCenterInViewport - containerRect.top;
    const rowTopInContainer = container.scrollTop + (rowRect.top - containerRect.top);
    const idealScrollTop = rowTopInContainer - targetCenterInContainer + rowRect.height / 2;
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const targetScrollTop = Math.max(0, Math.min(idealScrollTop, maxScrollTop));

    container.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });

    scheduleAutoScrollCompletion();
  }

  function handleManualBrowsingStart() {
    if (!playerState.lyricsAreSynced) {
      return;
    }

    if (autoScrollSettleTimeout) {
      clearTimeout(autoScrollSettleTimeout);
      autoScrollSettleTimeout = undefined;
    }

    isAutoScrolling = false;
    isManualBrowsing = true;
  }

  function handleLyricsScroll() {
    if (!playerState.lyricsAreSynced) {
      return;
    }

    if (isAutoScrolling) {
      scheduleAutoScrollCompletion();
      return;
    }

    isManualBrowsing = true;
  }

  function getDistance(i: number): number {
    if (proximityAnchorIndex < 0) return 999;
    return Math.abs(i - proximityAnchorIndex);
  }

  // ── Favorite ───────────────────────────────────────────────────────────
  $effect(() => {
    if (playerState.videoId) {
      videoService.isFavorite(playerState.videoId).then((f) => (isFavorite = f));
    }
  });

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
    } catch {
      notify.error($LL.notifications.favoriteError(), $LL.notifications.favoriteErrorMessage());
      isFavorite = wasFavorite;
    }
  }

  // ── Copy URL ───────────────────────────────────────────────────────────
  function copyURL() {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        copied = true;
        setTimeout(() => (copied = false), 2000);
        notify.success($LL.notifications.urlCopied(), '');
      })
      .catch(() => {
        notify.error($LL.notifications.urlCopyError(), '');
      });
  }

  function goToHome() {
    goto(resolve('/'));
  }
</script>

<div class="mobile-layout">
  {#if showSearch}
    <SearchBar />
  {/if}

  {#if showHeader}
    <!-- ── Top Logo ─────────────────────────────────────────────────── -->
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
  {/if}

  {#if showPlayer}
    <!-- ── Video section (Standard 16:9) ────────────────────────────── -->
    <div class="video-section">
      <PlayerView />
    </div>
  {/if}

  <!-- ── Info row ─────────────────────────────────────────────────── -->
  <div class="song-info">
    <div class="song-meta">
      <h1 class="song-title">
        {#if playerState.track}
          {playerState.track}
        {:else if playerState.artist}
          {playerState.artist}
        {:else}
          &nbsp;
        {/if}
      </h1>
      {#if playerState.artist && playerState.track && playerState.artist !== playerState.track}
        <p class="song-artist">{playerState.artist}</p>
      {/if}
    </div>

    <!-- Action buttons -->
    <div class="song-actions">
      <LikeButton isLiked={isFavorite} onclick={toggleFavorite} size={20} />
      <button
        onclick={copyURL}
        class="action-button list-button"
        aria-label={$LL.controls.copyUrl()}
        title={$LL.controls.copyUrl()}
      >
        {#if copied}
          <Check size={20} />
        {:else}
          <Copy size={20} />
        {/if}
      </button>
      <button
        class="action-button list-button"
        onclick={() => (playerState.isLyricSelectorOpen = true)}
        aria-label={$LL.controls.selectLyrics()}
        title={$LL.controls.selectLyrics()}
      >
        <ListBulletsIcon size={20} />
      </button>
    </div>
  </div>

  {#if showTimingControls}
    <!-- ── Timing Controls (Original appearance, inline layout) ─────── -->
    <div class="timing-controls-wrapper">
      <TimingControls layout="row" />
    </div>
  {/if}

  <!-- ── Translation Controls ─────────────────────────────────────── -->
  {#if playerState.translatedLines.length > 0}
    <div class="translation-controls">
      <button
        class="toggle-button"
        onclick={() => {
          playerState.showOriginalSubtitle = !playerState.showOriginalSubtitle;
        }}
        disabled={!playerState.lyricsAreSynced}
        aria-label={playerState.showOriginalSubtitle
          ? $LL.lyrics.hideOriginal()
          : $LL.lyrics.showOriginal()}
      >
        {#if playerState.showOriginalSubtitle}
          <EyeIcon size={18} />
        {:else}
          <EyeSlashIcon size={18} />
        {/if}
      </button>

      {#if shouldShowTransliteration && playerState.lyricsState === LyricsStates.Found}
        <ToggleSwitch
          checked={playerState.showTransliteration}
          onchange={handleTransliterationToggle}
          id="mobile-transliteration-toggle"
          label=""
        >
          {#snippet icon()}
            <TextAaIcon size={16} />
          {/snippet}
        </ToggleSwitch>
      {/if}

      <LanguageSelector compact />

      <button
        class="toggle-button"
        onclick={() => {
          playerState.showTranslatedSubtitle = !playerState.showTranslatedSubtitle;
        }}
        disabled={!playerState.lyricsAreSynced}
        aria-label={playerState.showTranslatedSubtitle
          ? $LL.lyrics.hideTranslated()
          : $LL.lyrics.showTranslated()}
      >
        {#if playerState.showTranslatedSubtitle}
          <EyeIcon size={18} />
        {:else}
          <EyeSlashIcon size={18} />
        {/if}
      </button>
    </div>
  {/if}

  <!-- ── Lyrics panel ─────────────────────────────────────────────── -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="lyrics-panel"
    bind:this={lyricsContainer}
    onscroll={handleLyricsScroll}
    onpointerdown={handleManualBrowsingStart}
    onwheel={handleManualBrowsingStart}
    ontouchstart={handleManualBrowsingStart}
  >
    <div class="lyrics-list">
      {#if playerState.lines.length > 0}
        {#each playerState.lines as line, i (i)}
          {#if line.text}
            {@const dist = getDistance(i)}
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <div
              class="lyric-item"
              class:d0={activeVisibleLineIndex === i}
              class:d1={!isManualBrowsing && i !== activeVisibleLineIndex && dist === 1}
              class:d2={!isManualBrowsing && i !== activeVisibleLineIndex && dist === 2}
              class:d3={!isManualBrowsing && i !== activeVisibleLineIndex && dist === 3}
              class:dfar={!isManualBrowsing && i !== activeVisibleLineIndex && dist > 3}
              class:upcoming={activeVisibleLineIndex < 0 && upcomingVisibleLineIndex === i}
              bind:this={lyricLineElements[i]}
              onclick={() => {
                if (playerState.lyricsAreSynced) seekTo(adjustedTimes[i] / 1000);
              }}
              onkeydown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && playerState.lyricsAreSynced)
                  seekTo(adjustedTimes[i] / 1000);
              }}
              role="button"
              tabindex="0"
            >
              <div class="lyric-content-wrapper">
                {#if playerState.showOriginalSubtitle}
                  <p class="lyric-original">{line.text}</p>
                  {#if playerState.showTransliteration && playerState.transliteratedLines[i]?.text}
                    <p class="lyric-transliterated">{playerState.transliteratedLines[i].text}</p>
                  {/if}
                {/if}

                {#if playerState.showTranslatedSubtitle && playerState.translatedLines[i]?.text}
                  <p class="lyric-translated">{playerState.translatedLines[i].text}</p>
                {/if}
              </div>
            </div>
          {/if}
        {/each}
        <div class="lyric-spacer" aria-hidden="true"></div>
      {:else if playerState.lyricsState === 'loading'}
        <p class="lyrics-placeholder">{$LL.lyrics.loading()}</p>
      {:else if playerState.lyricsState === 'notFound'}
        <p class="lyrics-placeholder">{$LL.lyrics.notFound()}</p>
      {/if}
    </div>
  </div>
</div>

<style>
  /* Base Layout */
  .mobile-layout {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    background-color: var(--background-color);
  }

  /* Logo */
  .top-logo-container {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 0;
    margin-top: 0.5rem;
    height: 35px; /* Fixed height so scaled logo doesn't leave huge empty space */
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
    transform: scale(0.3); /* Even smaller to avoid overlap with left header buttons */
    transform-origin: center top;
    margin-top: -16px; /* Bump up more */
  }

  /* Video */
  .video-section {
    flex-shrink: 0;
    width: 100%;
    padding: 0 1rem; /* Espaciado lateral para el reproductor */
    margin-top: 0.5rem; /* Bajar un poco el reproductor desde la cabecera */
    box-sizing: border-box;
  }

  /* Info */
  .song-info {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.5rem;
    gap: 1rem;
  }

  .song-meta {
    flex: 1;
    min-width: 0;
  }

  .song-title {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
    color: var(--text-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .song-artist {
    font-size: 0.85rem;
    color: var(--text-color);
    opacity: 0.7;
    margin: 0.2rem 0 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .song-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  /* Copied from PlayerLayout action buttons */
  .action-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-color);
    opacity: 0.8;
    transition:
      opacity var(--theme-transition-duration) var(--theme-transition-timing),
      color var(--theme-transition-duration) var(--theme-transition-timing);
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .action-button:hover {
    opacity: 1;
    background-color: rgba(156, 163, 175, 0.2);
  }

  /* Timing Controls */
  .timing-controls-wrapper {
    flex-shrink: 0;
    padding: 0 1.25rem 0.5rem;
  }

  /* Translation Controls */
  .translation-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 0.5rem 1.25rem 0.25rem;
    flex-shrink: 0;
  }

  .toggle-button {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-color);
    opacity: 0.7;
    transition:
      opacity 0.3s ease,
      color 0.3s ease;
    padding: 0.4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
  }

  .toggle-button:hover:not(:disabled) {
    opacity: 1;
    background-color: rgba(156, 163, 175, 0.2);
  }

  .toggle-button:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  /* Lyrics Panel */
  .lyrics-panel {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    -ms-overflow-style: none;
    scrollbar-width: none;
    mask-image: linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%);
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black 5%,
      black 95%,
      transparent 100%
    );
  }

  .lyrics-panel::-webkit-scrollbar {
    display: none;
  }

  .lyrics-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1.5rem 1.25rem 1rem;
    /* Removed gap so fixed heights handle spacing */
  }

  .lyric-item {
    width: 100%;
    cursor: pointer;
    padding: 0.1rem 0; /* Un poco de separación vertical */
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .lyric-content-wrapper {
    /* Apply transform to the wrapper to scale content without affecting layout flow */
    transition:
      transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      filter 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      background-color 0.3s ease;
    transform-origin: center center;
    width: 100%;
    padding: 0.75rem 0.5rem; /* Ajuste interno para dar espacio al nuevo fondo */
    border-radius: 12px;
    background-color: transparent;
  }

  /* Active line */
  .lyric-item.d0 .lyric-content-wrapper {
    transform: scale(
      1.05
    ); /* Incrementado de nuevo a 1.05 para compensar la falta de font-weight bold que podría romper el layout */
    opacity: 1;
    filter: none;
    background: linear-gradient(
      90deg,
      rgba(239, 68, 68, 0.15) 0%,
      rgba(239, 68, 68, 0.2) 50%,
      rgba(239, 68, 68, 0.15) 100%
    );
  }

  .lyric-item.upcoming .lyric-content-wrapper {
    opacity: 0.95;
    filter: none;
  }

  .lyric-item.upcoming::before {
    content: '';
    position: absolute;
    left: 0.5rem;
    right: 0.5rem;
    top: 0;
    height: 0.24rem;
    transform: translateY(-50%);
    border-radius: 999px;
    background: linear-gradient(
      90deg,
      rgba(239, 68, 68, 0.2) 0%,
      rgba(239, 68, 68, 0.75) 50%,
      rgba(239, 68, 68, 0.2) 100%
    );
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.16);
    pointer-events: none;
  }

  :global(html.dark-mode) .lyric-item.d0 .lyric-content-wrapper {
    background: var(--card-background);
  }

  :global(html.dark-mode) .lyric-item.upcoming::before {
    background: linear-gradient(
      90deg,
      rgba(248, 113, 113, 0.2) 0%,
      rgba(248, 113, 113, 0.65) 50%,
      rgba(248, 113, 113, 0.2) 100%
    );
    box-shadow: 0 0 4px rgba(248, 113, 113, 0.16);
  }

  /* ±1 */
  .lyric-item.d1 .lyric-content-wrapper {
    transform: scale(0.95);
    opacity: 0.72;
    filter: blur(0.3px);
  }

  /* ±2 */
  .lyric-item.d2 .lyric-content-wrapper {
    transform: scale(0.85);
    opacity: 0.48;
    filter: blur(0.65px);
  }

  /* ±3 */
  .lyric-item.d3 .lyric-content-wrapper {
    transform: scale(0.8);
    opacity: 0.28;
    filter: blur(1.1px);
  }

  /* far */
  .lyric-item.dfar .lyric-content-wrapper {
    transform: scale(0.75);
    opacity: 0.1;
    filter: blur(1.8px);
  }

  .lyric-original {
    /* Use fixed font-size, transform handles scaling */
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-color);
    margin: 0 0 0.2em;
    line-height: 1.4;
  }

  .lyric-item.d0 .lyric-original {
    font-weight: 700;
  }

  .lyric-transliterated {
    font-size: 0.95rem;
    color: var(--text-color);
    opacity: 0.8;
    margin: 0 0 0.2rem;
    line-height: 1.3;
    font-style: italic;
  }

  .lyric-translated {
    font-size: 0.85rem;
    color: var(--secondary-color);
    font-style: italic;
    margin: 0;
    line-height: 1.4;
    opacity: 0.9;
  }

  .lyric-spacer {
    flex-shrink: 0;
    height: 15vh; /* Mucho más pequeño para no perder las letras abajo */
  }

  .lyrics-placeholder {
    color: var(--text-color);
    opacity: 0.4;
    font-size: 0.85rem;
    margin-top: 2rem;
  }
</style>
