<script lang="ts">
  import { LyricsStates, playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { seekTo } from '$lib/features/player/services/playerActions';
  import { fade } from 'svelte/transition';
  import FileTextIcon from 'phosphor-svelte/lib/FileTextIcon';
  import TranslateIcon from 'phosphor-svelte/lib/TranslateIcon';
  import EyeIcon from 'phosphor-svelte/lib/EyeIcon';
  import EyeSlashIcon from 'phosphor-svelte/lib/EyeSlashIcon';
  import CloudSlashIcon from 'phosphor-svelte/lib/CloudSlashIcon';
  import TextAaIcon from 'phosphor-svelte/lib/TextAaIcon';
  import LanguageSelector from '$lib/features/settings/components/LanguageSelector.svelte';
  import ScrollToActiveLine from '$lib/features/ui/components/ScrollToActiveLine.svelte';
  import ToggleSwitch from '$lib/features/ui/components/ToggleSwitch.svelte';
  import { getPrimaryLanguage } from '$lib/shared/utils';
  import { LL } from '$i18n/i18n-svelte';
  import { translationStore } from '$lib/features/settings/stores/translationStore.svelte';
  import { transliterateLyrics } from '$lib/features/player/services/transliterationService';
  import { isTransliterableLanguage } from '$lib/features/settings/stores/transliterationStore.svelte';

  async function handleTransliterationToggle(checked: boolean) {
    console.log('[LyricsView] Toggle transliteration:', checked);
    console.log('[LyricsView] Current state:', {
      showTransliteration: playerState.showTransliteration,
      transliteratedLinesLength: playerState.transliteratedLines.length,
      transliterationLang: playerState.transliterationLang,
      linesLength: playerState.lines.length
    });

    // If we're enabling and don't have transliterated lines yet, process them
    if (
      checked &&
      playerState.transliteratedLines.length === 0 &&
      playerState.transliterationLang
    ) {
      console.log('[LyricsView] Need to transliterate, calling backend...');
      try {
        const result = await transliterateLyrics(
          playerState.lines,
          playerState.transliterationLang
        );
        console.log('[LyricsView] Transliteration result:', result);
        if (result.success) {
          console.log(
            '[LyricsView] Setting transliterated lines:',
            result.lines.map((l) => l.text)
          );
          playerState.transliteratedLines = result.lines;
        } else {
          console.error('[LyricsView] Transliteration failed:', result.error);
        }
      } catch (error) {
        console.error('Error transliterating lyrics:', error);
      }
    }
    playerState.showTransliteration = checked;
    console.log('[LyricsView] New showTransliteration state:', playerState.showTransliteration);
  }

  let lyricsContainerRef: HTMLDivElement | null = $state(null);
  let lyricsContentRef: HTMLDivElement | null = $state(null);
  let lyricRowRefs: (HTMLDivElement | null)[] = $state([]);
  let activeLineOffset = $state(0);
  let activeLineHeight = $state(0);
  let windowWidth = $state(0);
  let videoHeight = $state(0);

  const iconSize = $derived(windowWidth > 768 ? 30 : 20);
  const PORCENTAGE_LANGUAGE_THRESHOLD = 80;

  let isHorizontalMode = $derived(
    playerState.lyricsState === 'found' &&
      !playerState.isLoadingVideo &&
      playerState.duration > 0 &&
      windowWidth >= 1400 &&
      (!playerState.lyricsAreSynced || playerState.forceHorizontalMode)
  );

  let shouldShowTransliteration = $derived(
    playerState.transliterationAvailable &&
      playerState.transliterationLang !== null &&
      isTransliterableLanguage(playerState.transliterationLang)
  );

  // Measure the height of the player for the horizontal mode
  $effect(() => {
    if (!isHorizontalMode || !lyricsContainerRef) return;

    const parent = lyricsContainerRef.parentElement;
    if (!parent) return;

    // Buscar el contenedor del reproductor (PlayerView) que tiene el iframe
    const playerContainer = parent.querySelector('.video-wrapper .player-container');
    if (!playerContainer) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        videoHeight = entry.contentRect.height;
      }
    });

    observer.observe(playerContainer);

    return () => observer.disconnect();
  });

  const adjustedTimes = $derived(
    playerState.lines.map((line) => Math.max(0, line.startTimeMs + playerState.timingOffset))
  );

  let shouldDeemphasizeTranslatedLyrics = $derived(
    !!(
      playerState.detectedSourceLanguage &&
      getPrimaryLanguage(playerState.detectedSourceLanguage) ===
        getPrimaryLanguage(playerState.userLang) &&
      (playerState.percentageOfDetectedLanguages ?? 0) >= PORCENTAGE_LANGUAGE_THRESHOLD
    )
  );

  // Shared condition for auto-scrolling in horizontal mode with synced lyrics
  const canAutoScroll = $derived(
    isHorizontalMode && playerState.lyricsAreSynced && playerState.currentLineIndex >= 0
  );

  function scrollToLine(index: number, smooth: boolean = true) {
    if (index < 0 || index >= lyricRowRefs.length) return;

    const row = lyricRowRefs[index];
    const container = lyricsContentRef;
    if (!row || !container) return;

    // Check if there's scrollable content
    const canScroll = container.scrollHeight > container.clientHeight;
    if (!canScroll) return;

    const maxScrollTop = container.scrollHeight - container.clientHeight;
    const rowOffsetTop = row.offsetTop;
    const rowHeight = row.offsetHeight;
    const containerHeight = container.clientHeight;

    // Calculate ideal centered position
    const idealScrollTop = rowOffsetTop - containerHeight / 2 + rowHeight / 2;

    // Clamp to valid scroll range
    const targetScrollTop = Math.max(0, Math.min(idealScrollTop, maxScrollTop));

    // Always scroll to center the line when possible
    container.scrollTo({
      top: targetScrollTop,
      behavior: smooth ? 'smooth' : 'auto'
    });
  }

  function handleLineSelection(index: number, event?: KeyboardEvent) {
    // For keyboard events, only handle Enter and Space keys
    if (event && event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    if (!playerState.lyricsAreSynced) return;

    seekTo(adjustedTimes[index] / 1000);

    // Always scroll to center the selected line when in horizontal mode
    if (playerState.forceHorizontalMode && isHorizontalMode) {
      scrollToLine(index, true);
    }
  }

  // Track previous line index to detect when it actually changes
  let previousLineIndex = $state(-1);

  $effect(() => {
    const currentIndex = playerState.currentLineIndex;

    // Only proceed if can auto-scroll and index actually changed
    if (!canAutoScroll || currentIndex === previousLineIndex) {
      previousLineIndex = currentIndex;
      return;
    }

    previousLineIndex = currentIndex;

    // Always scroll to center the new active line when it changes
    // This happens during normal playback (autoscroll) or when clicking a line
    scrollToLine(currentIndex, true);
  });

  // Track previous playing state to detect when user presses play
  let wasPlaying = $state(false);

  $effect(() => {
    const isPlaying = playerState.isPlaying;
    const currentIndex = playerState.currentLineIndex;

    // Only proceed if can auto-scroll, playback just started, and index is valid
    if (!canAutoScroll || !isPlaying || wasPlaying) {
      wasPlaying = isPlaying;
      return;
    }

    wasPlaying = isPlaying;

    // Check if the active line is visible in the viewport
    const activeRow = lyricRowRefs[currentIndex];
    const container = lyricsContentRef;
    if (!activeRow || !container) return;

    const rowRect = activeRow.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Check if the row is fully visible within the container
    const isVisible = rowRect.top >= containerRect.top && rowRect.bottom <= containerRect.bottom;

    // If not visible, scroll to center it
    if (!isVisible) {
      scrollToLine(currentIndex, true);
    }
  });

  // Track previous horizontal mode state
  let wasHorizontalMode = $state(false);

  function getLineIndexToScroll(): number {
    const currentIndex = playerState.currentLineIndex;

    // If there's an active line, use it
    if (currentIndex >= 0) {
      return currentIndex;
    }

    // If no active line, find the line just before or at the current time
    const currentTimeMs = playerState.currentTime * 1000 + playerState.timingOffset;

    // Find the last line that should have been active (startTime <= currentTime)
    let lastActiveIndex = -1;
    for (let i = 0; i < playerState.lines.length; i++) {
      if (playerState.lines[i].startTimeMs <= currentTimeMs) {
        lastActiveIndex = i;
      } else {
        break;
      }
    }

    // If we found a line that should be active, use it
    if (lastActiveIndex >= 0) {
      return lastActiveIndex;
    }

    // If we're before the first line, scroll to the beginning
    return 0;
  }

  $effect(() => {
    const currentHorizontalMode = isHorizontalMode;

    // Only proceed if horizontal mode was just activated
    if (!currentHorizontalMode || wasHorizontalMode) {
      wasHorizontalMode = currentHorizontalMode;
      return;
    }

    // Update tracking
    wasHorizontalMode = currentHorizontalMode;

    // Wait a bit for the layout transition to complete, then scroll to appropriate line
    setTimeout(() => {
      const targetIndex = !playerState.lyricsAreSynced ? 0 : getLineIndexToScroll();
      scrollToLine(targetIndex, true);
    }, 300);
  });

  function recalculateActiveLinePosition(containerInfo?: { height: number; top: number }) {
    const hasActiveLineWithText =
      playerState.currentLineIndex !== null &&
      playerState.currentLineIndex >= 0 &&
      playerState.lines[playerState.currentLineIndex]?.text;

    if (hasActiveLineWithText) {
      const activeRow = lyricRowRefs[playerState.currentLineIndex];
      const container = lyricsContentRef;
      if (activeRow && container) {
        // Use getBoundingClientRect to calculate position relative to the container viewport
        // This accounts for container scroll position correctly
        const rowRect = activeRow.getBoundingClientRect();
        // Use provided container info from ResizeObserver if available, otherwise calculate
        const containerTop = containerInfo?.top ?? container.getBoundingClientRect().top;

        activeLineOffset = rowRect.top - containerTop + container.scrollTop;
        activeLineHeight = rowRect.height;
      }
    } else {
      activeLineHeight = 0;
      activeLineOffset = 0;
    }
  }

  $effect(() => {
    void windowWidth;
    void playerState.currentLineIndex;
    recalculateActiveLinePosition();
  });

  $effect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Only respond to 'H' key, not when typing in input fields
      if (e.key === 'h' || e.key === 'H') {
        // Check if user is typing in an input, textarea, or contenteditable element
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }

        // Only toggle if screen is wide enough and lyrics are synced
        // For unsynced lyrics, horizontal mode is always enabled and cannot be toggled
        if (windowWidth >= 1400 && playerState.lyricsAreSynced) {
          e.preventDefault();
          playerState.forceHorizontalMode = !playerState.forceHorizontalMode;
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  $effect(() => {
    const container = lyricsContentRef;
    if (!container) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const DEBOUNCE_MS = 100;

    const resizeObserver = new ResizeObserver((entries) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        // Use contentRect from ResizeObserver entry to avoid extra DOM reads
        for (const entry of entries) {
          const contentRect = entry.contentRect;
          recalculateActiveLinePosition({
            height: contentRect.height,
            top: entry.target.getBoundingClientRect().top
          });
          break; // Only process the first entry (container)
        }
      }, DEBOUNCE_MS);
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  });

  function formatTimestamp(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');

    if (hours > 0) {
      const formattedHours = hours.toString().padStart(2, '0');
      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }

    return `${formattedMinutes}:${formattedSeconds}`;
  }
</script>

<svelte:window bind:innerWidth={windowWidth} />

<div
  class="lyrics-container"
  class:horizontal-mode={isHorizontalMode}
  class:confirmed={isHorizontalMode}
  bind:this={lyricsContainerRef}
  style={isHorizontalMode && lyricsContainerRef
    ? `max-height: ${videoHeight > 0 ? videoHeight : Math.min(window.innerHeight * 0.55, (lyricsContainerRef.clientWidth * 9) / 16)}px;`
    : undefined}
>
  {#if playerState.translatedLines.length > 0}
    <div class="controls-wrapper">
      <button
        class="toggle-visibility"
        onclick={() => {
          playerState.showOriginalSubtitle = !playerState.showOriginalSubtitle;
        }}
        disabled={!playerState.lyricsAreSynced}
        aria-label={playerState.showOriginalSubtitle
          ? $LL.lyrics.hideOriginal()
          : $LL.lyrics.showOriginal()}
      >
        {#if playerState.showOriginalSubtitle}
          <EyeIcon size={20} />
        {:else}
          <EyeSlashIcon size={20} />
        {/if}
      </button>
      <LanguageSelector />
      <button
        class="toggle-visibility"
        onclick={() => {
          playerState.showTranslatedSubtitle = !playerState.showTranslatedSubtitle;
        }}
        disabled={!playerState.lyricsAreSynced}
        aria-label={playerState.showTranslatedSubtitle
          ? $LL.lyrics.hideTranslated()
          : $LL.lyrics.showTranslated()}
      >
        {#if playerState.showTranslatedSubtitle}
          <EyeIcon size={20} />
        {:else}
          <EyeSlashIcon size={20} />
        {/if}
      </button>
    </div>
  {:else}
    <div class="controls-placeholder"></div>
  {/if}
  <div class="lyrics-header">
    <h2 class="original-header">
      <FileTextIcon size={iconSize} weight="bold" />
      <span class="header-text">{$LL.lyrics.original()}</span>
    </h2>
    <div class="transliteration-header-container">
      {#if shouldShowTransliteration && playerState.lyricsState === LyricsStates.Found}
        <ToggleSwitch
          checked={playerState.showTransliteration}
          onchange={handleTransliterationToggle}
          id="transliteration-toggle"
          label={$LL.lyrics.showTransliteration()}
        >
          {#snippet icon()}
            <TextAaIcon size={16} />
          {/snippet}
        </ToggleSwitch>
      {/if}
    </div>
    <div class="translated-header-container">
      <h2 class="translated-header">
        <TranslateIcon size={iconSize} weight="bold" />
        <span class="header-text">{$LL.lyrics.translated()}</span>
        {#if translationStore.wasLastTranslationLocal && playerState.translatedLines.length > 0}
          <span class="local-indicator" title={$LL.chromeAI.localTranslationTooltip()}>
            <CloudSlashIcon size={16} weight="bold" />
          </span>
        {/if}
      </h2>
    </div>
  </div>

  <div class="lyrics-content" bind:this={lyricsContentRef}>
    {#if playerState.lyricsState === LyricsStates.Loading}
      <div class="no-lyrics-message">
        <p>{$LL.lyrics.loading()}</p>
      </div>
    {:else if playerState.lyricsState === LyricsStates.NotFound}
      <div class="no-lyrics-message">
        <FileTextIcon size={iconSize * 2} weight="bold" />
        <p>{$LL.lyrics.notFound()}</p>
      </div>
    {:else if playerState.lyricsState === LyricsStates.Found}
      {#if playerState.currentLineIndex !== null && playerState.currentLineIndex >= 0 && activeLineHeight > 0}
        <div
          class="active-line-background"
          style="transform: translateY({activeLineOffset}px); height: {activeLineHeight}px;"
        ></div>
      {/if}

      {#each playerState.lines as line, i (i)}
        {#if line.text}
          <div
            class="lyric-row"
            class:current={playerState.currentLineIndex === i}
            class:clickable={playerState.lyricsAreSynced}
            bind:this={lyricRowRefs[i]}
            onclick={() => handleLineSelection(i)}
            onkeydown={(e) => handleLineSelection(i, e)}
            role="button"
            tabindex="0"
          >
            <button
              type="button"
              class="lyric-line original"
              class:not-synced={!playerState.lyricsAreSynced}
            >
              <span class="lyric-text-container">
                <span class="sizer">{line.text}</span>
                <span class="content-wrapper">
                  <span class="content">{line.text}</span>
                  {#if playerState.showTransliteration && playerState.transliteratedLines[i]?.text}
                    <span class="transliteration" in:fade={{ duration: 200 }}
                      >{playerState.transliteratedLines[i].text}</span
                    >
                  {/if}
                </span>
              </span>
            </button>

            {#if playerState.lyricsAreSynced}
              <strong class="timestamp">
                <span>{formatTimestamp(adjustedTimes[i])}</span>
              </strong>
            {/if}

            <button
              type="button"
              class="lyric-line translated"
              class:not-synced={!playerState.lyricsAreSynced}
              class:deemphasized={shouldDeemphasizeTranslatedLyrics}
            >
              <span class="lyric-text-container">
                <span class="sizer">{playerState.translatedLines[i]?.text || ''}</span>
                <span class="content">{playerState.translatedLines[i]?.text || ''}</span>
              </span>
            </button>
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  <ScrollToActiveLine {lyricRowRefs} />
</div>

<style>
  :root {
    --middle-col-width: 192px;
  }

  .lyrics-container {
    margin: 0 auto 2rem;
    max-width: clamp(800px, calc(46.875vw), 1200px);
    padding: 2rem;
    background-color: var(--card-background);
    border-radius: 12px;
    box-shadow: 0 10px 30px var(--shadow-color);
    position: relative;
    overflow: visible;
    width: 100%;
    box-sizing: border-box;
    transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @media (min-width: 2561px) {
    .lyrics-container {
      max-width: clamp(1200px, calc(52.083vw), 2000px);
    }
  }

  .lyrics-container.horizontal-mode {
    max-width: 100%;
  }

  .active-line-background {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    background: linear-gradient(
      90deg,
      rgba(239, 68, 68, 0.15) 0%,
      rgba(239, 68, 68, 0.2) 50%,
      rgba(239, 68, 68, 0.15) 100%
    );
    border-radius: 8px;
    transition:
      transform 0.4s cubic-bezier(0.4, 0, 0.2, 1),
      height 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.05s;
    pointer-events: none;
    z-index: 0;
  }

  .lyrics-header {
    display: grid;
    grid-template-columns: 1fr var(--middle-col-width) 1fr;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--border-color);
    align-items: start;
  }

  .lyrics-content {
    position: relative;
  }

  .lyrics-header h2 {
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin: 0;
  }

  .original-header {
    grid-column: 1;
  }

  .transliteration-header-container {
    grid-column: 2;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .translated-header-container {
    grid-column: 3;
  }

  .controls-wrapper {
    display: grid;
    grid-template-columns: 1fr var(--middle-col-width) 1fr;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.75rem;
    width: 100%;
    padding: 0;
  }

  .translated-header-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    position: relative;
  }

  .local-indicator {
    display: inline-flex;
    align-items: center;
    margin-left: 0.35rem;
    color: #4cc9f0;
    cursor: help;
  }

  .lyric-row {
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1fr var(--middle-col-width) 1fr;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    gap: 0.5rem;
    padding: 0;
    transition: border-radius 0.3s ease-in-out;
    position: relative;
    z-index: 1;
    min-height: 3rem;
  }

  .controls-wrapper :nth-child(2) {
    max-width: var(--middle-col-width);
    width: 100%;
  }

  .lyric-row.clickable {
    cursor: pointer;
  }

  .lyric-row:last-child {
    border-bottom: none;
  }

  .lyric-row:hover {
    background-color: rgba(var(--primary-color), 0.05);
    border-radius: 8px;
  }

  .lyric-row.current .lyric-line .content {
    color: var(--primary-color);
    -webkit-text-stroke: 0.8px currentColor;
    text-shadow: 0 0 1px currentColor;
  }

  .lyric-line {
    margin: 0;
    line-height: 1.5;
    cursor: pointer;
    padding: 0.8rem 0;
    border-radius: 8px;
    background: none;
    border: none;
    font: inherit;
    color: inherit;
    text-align: center;
    flex: 1;
    box-sizing: border-box;
    transition:
      color 0.4s ease-in-out,
      transform 0.2s ease-in-out;
    white-space: pre-wrap;
    align-items: baseline;
    align-self: stretch;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  .lyric-line.original {
    grid-column: 1;
  }

  .lyric-line.translated {
    grid-column: 3;
  }

  .lyric-line > * {
    display: inline;
  }

  .lyric-line.not-synced {
    cursor: default;
  }

  .lyric-text-container {
    display: grid;
    grid-template-areas: 'text';
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  .lyric-text-container > .sizer,
  .lyric-text-container > .content {
    grid-area: text;
    white-space: pre-wrap;
  }

  .lyric-text-container > .sizer {
    font-weight: bold;
    visibility: hidden;
  }

  .content-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    grid-area: text;
  }

  .transliteration {
    font-size: 0.85em;
    color: var(--text-color-light);
    opacity: 0.7;
    font-style: italic;
    font-weight: normal;
    line-height: 1.3;
    transition:
      opacity 0.2s ease-out,
      max-height 0.2s ease-out;
    overflow: hidden;
  }

  /* En línea activa, la transliteración también se resalta pero menos */
  .lyric-row.current .transliteration {
    opacity: 0.9;
    color: color-mix(in srgb, var(--primary-color) 70%, var(--text-color-light));
  }

  /* Mobile: truncar si es muy largo */
  @media (max-width: 768px) {
    .transliteration {
      font-size: 0.8em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
  }

  .timestamp {
    font-weight: bold;
    color: var(--text-color);
    text-align: center;
    grid-column: 2;
  }

  .controls-wrapper > button:first-child {
    justify-self: center;
    margin-right: 0;
  }

  .controls-wrapper > :nth-child(2) {
    justify-self: center;
  }

  .controls-wrapper > button:last-child {
    justify-self: center;
    margin-left: 0;
  }

  .toggle-visibility {
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 10px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background-color 0.3s ease,
      border-color 0.3s ease,
      color 0.3s ease,
      transform 0.2s ease,
      box-shadow 0.2s ease;
    width: 42px;
    height: 42px;
    box-sizing: border-box;
    touch-action: manipulation;
  }

  .lyric-line.deemphasized .content {
    color: var(--text-color-light);
    opacity: 0.4;
  }

  @media (max-width: 768px) {
    :root {
      --middle-col-width: 60px;
    }

    .lyrics-container {
      padding: 1rem;
    }

    .lyrics-header {
      display: grid;
      grid-template-columns: 1fr var(--middle-col-width) 1fr;
      gap: 0.5rem;
      align-items: center;
    }

    .lyrics-header h2 {
      margin: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      align-self: center;
      justify-self: center;
      width: 100%;
      font-size: 1rem;
    }

    .original-header {
      grid-column: 1;
    }

    .transliteration-header-container {
      grid-column: 2;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .translated-header-container {
      grid-column: 3;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      position: relative;
      align-self: center;
      justify-self: center;
      width: 100%;
      text-align: center;
    }

    .lyric-row {
      grid-template-columns: minmax(0, 1fr) var(--middle-col-width) minmax(0, 1fr); /* Use mobile-specific middle column width */
      gap: 0.5rem;
    }

    .lyric-line {
      padding: 0.6rem 0.25rem;
      font-size: 0.7rem;
      word-break: break-word;
      white-space: normal;
      min-width: 0;
    }

    .controls-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      width: 100%;
    }

    .controls-wrapper > :nth-child(2) {
      width: 140px;
      max-width: 140px;
    }

    .timestamp {
      font-weight: bold;
      color: var(--text-color);
      text-align: center;
      font-size: 0.8rem;
    }

    .toggle-visibility {
      background-color: var(--card-background);
      border: 1px solid var(--border-color);
      color: var(--text-color);
      padding: 10px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition:
        background-color 0.3s ease,
        border-color 0.3s ease,
        color 0.3s ease,
        transform 0.2s ease,
        box-shadow 0.2s ease;
      height: 40px;
      width: 40px;
      box-sizing: border-box;
      touch-action: manipulation;
    }
  }

  @media (max-width: 480px) {
    .lyrics-header h2 .header-text {
      display: none;
    }
  }

  @media (min-width: 1400px) and (max-width: 2560px) {
    .lyrics-container.horizontal-mode .lyric-line .content {
      font-size: 1.05rem;
      line-height: 1.5;
      padding: 0.85rem 0;
    }

    .lyrics-container.horizontal-mode .lyrics-header h2 {
      font-size: 1.2rem;
    }

    .lyrics-container.horizontal-mode .timestamp {
      font-size: 1.05rem;
    }

    .lyrics-container.horizontal-mode .lyric-row {
      min-height: 3.3rem;
    }
  }

  @media (min-width: 2561px) {
    .lyric-line .content {
      font-size: 1.2rem;
      line-height: 1.5;
      padding: 0.9rem 0;
    }

    .lyrics-header h2 {
      font-size: 1.4rem;
    }

    .timestamp {
      font-size: 1.2rem;
    }

    .lyric-row {
      min-height: 3.5rem;
    }

    .lyrics-container.horizontal-mode .lyric-line .content {
      font-size: 1.3rem;
      line-height: 1.5;
      padding: 1rem 0;
    }

    .lyrics-container.horizontal-mode .lyrics-header h2 {
      font-size: 1.5rem;
    }

    .lyrics-container.horizontal-mode .timestamp {
      font-size: 1.3rem;
    }

    .lyrics-container.horizontal-mode .lyric-row {
      min-height: 3.8rem;
    }
  }

  .toggle-visibility:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--primary-color-hover), var(--secondary-color));
    transform: scale(1.05);
  }

  .toggle-visibility:disabled {
    cursor: not-allowed;
    opacity: 0.4;
    pointer-events: none;
  }

  .controls-placeholder {
    height: 42px;
    margin-bottom: 1rem;
  }

  .no-lyrics-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: var(--text-color-light);
    font-size: 1rem;
    gap: 1rem;
  }

  .no-lyrics-message p {
    margin: 0;
  }

  .lyrics-container.horizontal-mode {
    margin: 0;
    padding: 0.75rem 0.5rem;
    height: auto;
    max-height: 100%;
    min-height: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    overflow: hidden;
  }

  .lyrics-container.horizontal-mode .lyrics-header {
    flex-shrink: 0;
    padding-bottom: 0.75rem;
  }

  .lyrics-container.horizontal-mode .lyrics-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    scrollbar-width: thin;
    scrollbar-color: var(--primary-color) var(--card-background);
    min-height: 0;
    max-height: none;
    padding-right: 0.5rem;
  }

  .lyrics-container.horizontal-mode .lyrics-content::-webkit-scrollbar {
    width: 8px;
  }

  .lyrics-container.horizontal-mode .lyrics-content::-webkit-scrollbar-track {
    background: var(--card-background);
  }

  .lyrics-container.horizontal-mode .lyrics-content::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 4px;
  }

  .lyrics-container.horizontal-mode .lyrics-content::-webkit-scrollbar-thumb:hover {
    background: var(--primary-color-hover, color-mix(in srgb, var(--primary-color) 80%, black));
  }
</style>
