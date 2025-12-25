<script lang="ts">
  import { LyricsStates, playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { seekTo } from '$lib/features/player/services/playerActions';
  import FileText from 'phosphor-svelte/lib/FileText';
  import Translate from 'phosphor-svelte/lib/Translate';
  import Eye from 'phosphor-svelte/lib/Eye';
  import EyeSlash from 'phosphor-svelte/lib/EyeSlash';
  import CloudSlash from 'phosphor-svelte/lib/CloudSlash';
  import LanguageSelector from '$lib/features/settings/components/LanguageSelector.svelte';
  import { getPrimaryLanguage } from '$lib/shared/utils';
  import { LL } from '$i18n/i18n-svelte';
  import { translationStore } from '$lib/features/settings/stores/translationStore.svelte';

  let hoveredIndex: number | null = $state(null);
  let lyricsContainerRef: HTMLDivElement | null = $state(null);
  let lyricsContentRef: HTMLDivElement | null = $state(null);
  let lyricRowRefs: (HTMLDivElement | null)[] = $state([]);
  let activeLineOffset = $state(0);
  let activeLineHeight = $state(0);
  let windowWidth = $state(0);

  const iconSize = $derived(windowWidth > 768 ? 30 : 20);
  const PORCENTAGE_LANGUAGE_THRESHOLD = 80;

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

  // Update the active line position whenever currentLineIndex changes or window is resized
  $effect(() => {
    // Reference windowWidth to make this effect react to window resizes
    void windowWidth; // Referencing windowWidth to make it a dependency, that's how Svelte works in an $effect rune

    const hasActiveLineWithText =
      playerState.currentLineIndex !== null &&
      playerState.currentLineIndex >= 0 &&
      playerState.lines[playerState.currentLineIndex]?.text;

    if (hasActiveLineWithText) {
      // Espera a que el navegador termine el layout
      requestAnimationFrame(() => {
        const activeRow = lyricRowRefs[playerState.currentLineIndex];
        const container = lyricsContentRef;
        if (activeRow && container) {
          const rowRect = activeRow.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          activeLineOffset = rowRect.top - containerRect.top + container.scrollTop;
          activeLineHeight = rowRect.height;
        }
      });
    } else {
      activeLineHeight = 0;
      activeLineOffset = 0;
    }
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

<div class="lyrics-container" bind:this={lyricsContainerRef}>
  {#if playerState.translatedLines.length > 0}
    <div class="controls-wrapper">
      <button
        class="toggle-visibility"
        onclick={() => {
          playerState.showOriginalSubtitle = !playerState.showOriginalSubtitle;
        }}
        aria-label={playerState.showOriginalSubtitle
          ? $LL.lyrics.hideOriginal()
          : $LL.lyrics.showOriginal()}
      >
        {#if playerState.showOriginalSubtitle}
          <Eye size={20} />
        {:else}
          <EyeSlash size={20} />
        {/if}
      </button>
      <LanguageSelector />
      <button
        class="toggle-visibility"
        onclick={() => {
          playerState.showTranslatedSubtitle = !playerState.showTranslatedSubtitle;
        }}
        aria-label={playerState.showTranslatedSubtitle
          ? $LL.lyrics.hideTranslated()
          : $LL.lyrics.showTranslated()}
      >
        {#if playerState.showTranslatedSubtitle}
          <Eye size={20} />
        {:else}
          <EyeSlash size={20} />
        {/if}
      </button>
    </div>
  {:else}
    <div style="height: 42px; margin-bottom: 1rem;"></div>
  {/if}
  <div class="lyrics-header">
    <h2 class="original-header">
      <FileText size={iconSize} weight="bold" />
      <span class="header-text">{$LL.lyrics.original()}</span>
    </h2>
    <div class="translated-header-container">
      <h2 class="translated-header">
        <Translate size={iconSize} weight="bold" />
        <span class="header-text">{$LL.lyrics.translated()}</span>
        {#if translationStore.wasLastTranslationLocal && playerState.translatedLines.length > 0}
          <span class="local-indicator" title={$LL.chromeAI.localTranslationTooltip()}>
            <CloudSlash size={16} weight="bold" />
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
        <FileText size={iconSize * 2} weight="bold" />
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
            class:hovered={hoveredIndex === i}
            class:current={playerState.currentLineIndex === i}
            class:clickable={playerState.lyricsAreSynced}
            bind:this={lyricRowRefs[i]}
            onmouseenter={() => (hoveredIndex = i)}
            onmouseleave={() => (hoveredIndex = null)}
            onclick={() => {
              if (playerState.lyricsAreSynced) seekTo(adjustedTimes[i] / 1000);
            }}
            onkeydown={(e) => {
              if (playerState.lyricsAreSynced && (e.key === 'Enter' || e.key === ' ')) {
                seekTo(adjustedTimes[i] / 1000);
              }
            }}
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
                <span class="content">{line.text}</span>
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
</div>

<style>
  :root {
    --middle-col-width: 192px;
  }

  .lyrics-container {
    margin: 2rem auto;
    max-width: 1200px;
    padding: 2rem;
    background-color: var(--card-background);
    border-radius: 12px;
    box-shadow: 0 10px 30px var(--shadow-color);
    position: relative;
    overflow: hidden;
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
      transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
      height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    z-index: 0;
  }

  .lyrics-header {
    display: grid;
    grid-template-columns: 1fr var(--middle-col-width) 1fr;
    gap: 0.5rem;
    padding-bottom: 1rem;
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

  .translated-header-container {
    grid-column: 3;
  }

  .controls-wrapper {
    display: grid;
    grid-template-columns: 1fr var(--middle-col-width) 1fr;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
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

  .lyric-row.hovered {
    background-color: rgba(var(--primary-color), 0.05);
    border-radius: 8px;
  }

  .lyric-row.current {
    color: var(--primary-color);
    font-weight: bold;
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
      color 0.3s ease-in-out,
      font-weight 0.3s ease-in-out,
      transform 0.2s ease-in-out;
    white-space: pre-wrap;
    align-items: baseline;
    align-self: stretch;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
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

  .timestamp {
    font-weight: bold;
    color: var(--text-color);
    text-align: center;
  }

  .controls-wrapper {
    display: grid;
    grid-template-columns: 1fr var(--middle-col-width) 1fr;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 1rem;
    width: 100%;
    padding: 0;
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
      margin: 1rem 0;
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

  .toggle-visibility:hover {
    background-color: var(--shadow-color);
    transform: scale(1.05);
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
</style>
