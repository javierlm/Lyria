<script lang="ts">
  import { playerState, LyricsStates } from '$lib/features/player/stores/playerStore.svelte';
  import { seekTo, toggleImmersiveMode } from '$lib/features/player/services/playerActions';
  import {
    cancelScrollRecovery,
    getInitialTargetLineIndex,
    getUpcomingVisibleLineIndex,
    hasVisibleText,
    scheduleScrollRecovery,
    type ScrollRecoveryHandle
  } from '$lib/features/player/services/lyricsScrollRecovery';
  import LL from '$i18n/i18n-svelte';
  import { isTransliterableLanguage } from '$lib/features/settings/stores/transliterationStore.svelte';
  import ArrowDownIcon from 'phosphor-svelte/lib/ArrowDown';

  // ── State ──────────────────────────────────────────────────────────────
  let lyricsContainer: HTMLDivElement;
  let lyricLineElements: HTMLDivElement[] = $state([]);
  let isAutoScrolling = false;
  let isUserBrowsing = $state(false);
  let autoScrollSettleTimeout: ReturnType<typeof setTimeout> | undefined;
  let autoScrollMonitorFrame: number | undefined;
  let autoScrollLastTop = 0;
  let autoScrollStableFrames = 0;
  let manualScrollSettleTimeout: ReturnType<typeof setTimeout> | undefined;
  const initialScrollRecovery: ScrollRecoveryHandle = {
    frameId: undefined,
    retryTimeout: undefined
  };
  let previousLineIndex = $state(-1);
  let initialScrollDone = $state(false);
  const ACTIVE_LINE_CENTER_BIAS_PX = 20;

  const shouldShowTransliteration = $derived(
    playerState.transliterationAvailable &&
      playerState.transliterationLang !== null &&
      isTransliterableLanguage(playerState.transliterationLang)
  );

  // ── Derived ────────────────────────────────────────────────────────────
  const adjustedTimes = $derived(
    playerState.lines.map((line) => Math.max(0, line.startTimeMs + playerState.timingOffset))
  );

  const activeVisibleLineIndex = $derived.by(() => {
    const currentIndex = playerState.currentLineIndex;

    if (currentIndex >= 0 && hasVisibleText(playerState.lines, currentIndex)) {
      return currentIndex;
    }

    return -1;
  });

  const upcomingVisibleLineIndex = $derived.by(() => {
    if (activeVisibleLineIndex >= 0 || !playerState.lyricsAreSynced) {
      return -1;
    }

    return getUpcomingVisibleLineIndex({
      lines: playerState.lines,
      currentLineIndex: playerState.currentLineIndex,
      currentTimeSeconds: playerState.currentTime,
      timingOffsetMs: playerState.timingOffset,
      lyricsAreSynced: playerState.lyricsAreSynced
    });
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

    if (isUserBrowsing) {
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

      if (autoScrollMonitorFrame !== undefined) {
        cancelAnimationFrame(autoScrollMonitorFrame);
        autoScrollMonitorFrame = undefined;
      }

      if (manualScrollSettleTimeout) {
        clearTimeout(manualScrollSettleTimeout);
        manualScrollSettleTimeout = undefined;
      }

      cancelScrollRecovery(initialScrollRecovery);
    };
  });

  function scheduleManualBrowsingCompletion() {
    if (manualScrollSettleTimeout) {
      clearTimeout(manualScrollSettleTimeout);
    }

    manualScrollSettleTimeout = setTimeout(() => {
      isUserBrowsing = false;
      manualScrollSettleTimeout = undefined;

      const targetIndex = visualTargetLineIndex;
      if (targetIndex >= 0) {
        scrollToLine(targetIndex, false);
      }
    }, 220);
  }

  function scheduleAutoScrollCompletion() {
    if (autoScrollSettleTimeout) {
      clearTimeout(autoScrollSettleTimeout);
    }

    autoScrollSettleTimeout = setTimeout(() => {
      isAutoScrolling = false;
      isUserBrowsing = false;
      autoScrollSettleTimeout = undefined;
    }, 350);
  }

  function stopAutoScrollMonitor() {
    if (autoScrollMonitorFrame !== undefined) {
      cancelAnimationFrame(autoScrollMonitorFrame);
      autoScrollMonitorFrame = undefined;
    }
  }

  function startAutoScrollMonitor(container: HTMLDivElement) {
    stopAutoScrollMonitor();

    autoScrollLastTop = container.scrollTop;
    autoScrollStableFrames = 0;

    const monitor = () => {
      if (!isAutoScrolling) {
        stopAutoScrollMonitor();
        return;
      }

      const currentTop = container.scrollTop;
      const delta = Math.abs(currentTop - autoScrollLastTop);

      if (delta < 0.5) {
        autoScrollStableFrames += 1;
      } else {
        autoScrollStableFrames = 0;
      }

      autoScrollLastTop = currentTop;

      if (autoScrollStableFrames >= 3) {
        isAutoScrolling = false;
        isUserBrowsing = false;

        if (autoScrollSettleTimeout) {
          clearTimeout(autoScrollSettleTimeout);
          autoScrollSettleTimeout = undefined;
        }

        stopAutoScrollMonitor();
        return;
      }

      autoScrollMonitorFrame = requestAnimationFrame(monitor);
    };

    autoScrollMonitorFrame = requestAnimationFrame(monitor);
  }

  function scrollToLine(index: number, smooth = true) {
    const row = lyricLineElements[index];
    const container = lyricsContainer;
    if (!row || !container) return;

    if (autoScrollSettleTimeout) {
      clearTimeout(autoScrollSettleTimeout);
    }

    isAutoScrolling = true;
    isUserBrowsing = false;

    if (manualScrollSettleTimeout) {
      clearTimeout(manualScrollSettleTimeout);
      manualScrollSettleTimeout = undefined;
    }

    const rowRect = row.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const visibleTop = Math.max(containerRect.top, 0);
    const visibleBottom = Math.min(containerRect.bottom, window.innerHeight);
    const visibleCenterInViewport = (visibleTop + visibleBottom) / 2;
    const targetCenterInContainer =
      visibleCenterInViewport - containerRect.top - ACTIVE_LINE_CENTER_BIAS_PX;
    const rowTopInContainer = container.scrollTop + (rowRect.top - containerRect.top);
    const idealScrollTop = rowTopInContainer - targetCenterInContainer + rowRect.height / 2;
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const targetScrollTop = Math.max(0, Math.min(idealScrollTop, maxScrollTop));

    container.scrollTo({
      top: targetScrollTop,
      behavior: smooth ? 'smooth' : 'auto'
    });

    startAutoScrollMonitor(container);
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

    stopAutoScrollMonitor();
    isAutoScrolling = false;
    isUserBrowsing = true;
    scheduleManualBrowsingCompletion();
  }

  function handleLyricsScroll() {
    if (!playerState.lyricsAreSynced) {
      return;
    }

    if (isAutoScrolling) {
      scheduleAutoScrollCompletion();
      return;
    }

    if (!isUserBrowsing) {
      return;
    }

    scheduleManualBrowsingCompletion();
  }

  function getDistance(i: number): number {
    if (proximityAnchorIndex < 0) return 999;
    return Math.abs(i - proximityAnchorIndex);
  }

  function scrollToInitialTarget() {
    const targetIndex = getInitialTargetLineIndex({
      lines: playerState.lines,
      currentLineIndex: playerState.currentLineIndex,
      currentTimeSeconds: playerState.currentTime,
      timingOffsetMs: playerState.timingOffset,
      lyricsAreSynced: playerState.lyricsAreSynced
    });
    if (targetIndex < 0) {
      return;
    }

    scrollToLine(targetIndex);
  }

  // Initial snap when immersive view mounts:
  // 1) immediate on next frame
  // 2) one short retry after layout settles
  $effect(() => {
    if (initialScrollDone) {
      return;
    }

    initialScrollDone = true;

    scheduleScrollRecovery(initialScrollRecovery, scrollToInitialTarget);
  });

  function handleExitImmersive() {
    toggleImmersiveMode();
  }
</script>

<div class="immersive-lyrics-view">
  <!-- Exit button -->
  <button
    class="exit-button"
    onclick={handleExitImmersive}
    aria-label={$LL.controls.exitImmersiveMode()}
    title={$LL.controls.exitImmersiveMode()}
  >
    <ArrowDownIcon size={20} weight="bold" />
  </button>

  <!-- Translation/Transliteration controls -->
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
        {playerState.showOriginalSubtitle ? '👁' : '👁‍🗨'}
      </button>

      {#if shouldShowTransliteration && playerState.lyricsState === LyricsStates.Found}
        <button
          class="toggle-button"
          onclick={() => {
            playerState.showTransliteration = !playerState.showTransliteration;
          }}
          aria-label={$LL.lyrics.toggleTransliteration()}
        >
          Aa
        </button>
      {/if}

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
        {playerState.showTranslatedSubtitle ? '🌐' : '🌐‍🗨'}
      </button>
    </div>
  {/if}

  <!-- Lyrics panel -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="lyrics-panel lyrics-mask"
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
            <div
              class="lyric-item"
              class:d0={activeVisibleLineIndex === i}
              class:d1={!isUserBrowsing && i !== activeVisibleLineIndex && dist === 1}
              class:d2={!isUserBrowsing && i !== activeVisibleLineIndex && dist === 2}
              class:d3={!isUserBrowsing && i !== activeVisibleLineIndex && dist === 3}
              class:dfar={!isUserBrowsing && i !== activeVisibleLineIndex && dist > 3}
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
  :root {
    --immersive-side-gap: 0.75rem;
  }

  .immersive-lyrics-view {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    background: var(--background-color, #0a0a0a);
    height: 100dvh;
    overflow: hidden;
  }

  /* Exit button */
  .exit-button {
    position: absolute;
    top: calc(16px + env(safe-area-inset-top, 0px));
    left: 16px;
    z-index: 60;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .exit-button:hover {
    opacity: 1;
  }

  /* Translation controls */
  .translation-controls {
    position: absolute;
    top: calc(16px + env(safe-area-inset-top, 0px));
    right: 16px;
    z-index: 60;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .toggle-button {
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
    cursor: pointer;
    color: white;
    opacity: 0.8;
    transition: opacity 0.3s ease;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    font-size: 0.85rem;
  }

  .toggle-button:hover:not(:disabled) {
    opacity: 1;
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
    padding-top: 60px;
    padding-bottom: 60px;
  }

  .lyrics-panel::-webkit-scrollbar {
    display: none;
  }

  .lyrics-mask {
    mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0%,
      black 15%,
      black 85%,
      transparent 100%
    );
  }

  .lyrics-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1.5rem 2rem 1rem;
  }

  .lyric-item {
    width: 100%;
    max-width: 600px;
    cursor: pointer;
    padding: 0.25rem var(--immersive-side-gap);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-sizing: border-box;
    contain-intrinsic-size: auto 60px;
  }

  .lyric-content-wrapper {
    transition:
      transform 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
      filter 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: center center;
    width: 100%;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    will-change: transform, opacity, filter;
  }

  /* Active line - d0 */
  .lyric-item.d0 .lyric-content-wrapper {
    transform: scale(1.1);
    opacity: 1;
    filter: none;
    background: linear-gradient(
      90deg,
      rgba(239, 68, 68, 0.15) 0%,
      rgba(239, 68, 68, 0.2) 50%,
      rgba(239, 68, 68, 0.15) 100%
    );
  }

  :global(html.dark-mode) .lyric-item.d0 .lyric-content-wrapper {
    background: var(--card-background, rgba(255, 255, 255, 0.05));
  }

  /* Upcoming indicator */
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

  :global(html.dark-mode) .lyric-item.upcoming::before {
    background: linear-gradient(
      90deg,
      rgba(248, 113, 113, 0.2) 0%,
      rgba(248, 113, 113, 0.65) 50%,
      rgba(248, 113, 113, 0.2) 100%
    );
    box-shadow: 0 0 4px rgba(248, 113, 113, 0.16);
  }

  /* Distance-based blur - more aggressive than mobile */
  .lyric-item.d1 .lyric-content-wrapper {
    transform: scale(0.95);
    opacity: 0.7;
    filter: blur(0.5px);
  }

  .lyric-item.d2 .lyric-content-wrapper {
    transform: scale(0.85);
    opacity: 0.45;
    filter: blur(1px);
  }

  .lyric-item.d3 .lyric-content-wrapper {
    transform: scale(0.75);
    opacity: 0.2;
    filter: blur(1.5px);
  }

  .lyric-item.dfar .lyric-content-wrapper {
    transform: scale(0.65);
    opacity: 0.05;
    filter: blur(2.5px);
    content-visibility: auto;
  }

  /* Text styles */
  .lyric-original {
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--text-color, #ffffff);
    margin: 0 0 0.2em;
    line-height: 1.4;
  }

  .lyric-item.d0 .lyric-original {
    font-weight: 700;
    font-size: 1.4rem;
  }

  .lyric-transliterated {
    font-size: 1.1rem;
    color: var(--text-color, #ffffff);
    opacity: 0.8;
    margin: 0 0 0.2rem;
    line-height: 1.3;
    font-style: italic;
  }

  .lyric-translated {
    font-size: 1rem;
    color: var(--secondary-color, #9ca3af);
    font-style: italic;
    margin: 0;
    line-height: 1.4;
    opacity: 0.9;
  }

  .lyric-spacer {
    flex-shrink: 0;
    height: 30vh;
  }

  .lyrics-placeholder {
    color: var(--text-color, #ffffff);
    opacity: 0.4;
    font-size: 1rem;
    margin-top: 2rem;
    text-align: center;
  }

  @media (max-width: 768px) {
    :root {
      --immersive-side-gap: 0.875rem;
    }

    .lyrics-list {
      padding: 1.5rem 1rem 1rem;
    }

    .lyric-original {
      font-size: 1.1rem;
    }

    .lyric-item.d0 .lyric-original {
      font-size: 1.2rem;
    }

    .lyric-transliterated {
      font-size: 0.95rem;
    }

    .lyric-translated {
      font-size: 0.9rem;
    }
  }
</style>
