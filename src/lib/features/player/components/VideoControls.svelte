<script lang="ts">
  import IconPlay from 'phosphor-svelte/lib/Play';
  import IconPause from 'phosphor-svelte/lib/Pause';
  import SpeakerHigh from 'phosphor-svelte/lib/SpeakerHigh';
  import SpeakerSlash from 'phosphor-svelte/lib/SpeakerSlash';
  import ArrowsOutSimpleIcon from 'phosphor-svelte/lib/ArrowsOutSimpleIcon';
  import ArrowsInSimpleIcon from 'phosphor-svelte/lib/ArrowsInSimpleIcon';
  import Eye from 'phosphor-svelte/lib/Eye';
  import EyeSlash from 'phosphor-svelte/lib/EyeSlash';
  import LL from '$i18n/i18n-svelte';

  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import {
    play,
    pause,
    seekTo,
    setVolume,
    mute,
    toggleOriginalSubtitleVisibility,
    unMute
  } from '$lib/features/player/services/playerActions';

  interface Props {
    onToggleFullscreen?: () => void;
    onSeekInteractionStart?: () => void;
    onSeekInteractionEnd?: () => void;
    seekNavId?: string;
    playPauseNavId?: string;
    muteNavId?: string;
    originalSubtitleNavId?: string;
    translatedSubtitleNavId?: string;
    fullscreenNavId?: string;
  }

  let {
    onToggleFullscreen,
    onSeekInteractionStart,
    onSeekInteractionEnd,
    seekNavId,
    playPauseNavId,
    muteNavId,
    originalSubtitleNavId,
    translatedSubtitleNavId,
    fullscreenNavId
  }: Props = $props();
  const TOUCH_FULLSCREEN_QUERY = '(max-width: 768px) and (pointer: coarse)';

  let seekBarElement: HTMLInputElement | null = null;
  let isSeekInteractionActive = $state(false);

  function togglePlayPause() {
    if (playerState.isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function handleSeek(event: Event) {
    const target = event.target as HTMLInputElement;
    const seekTime = parseFloat(target.value);
    seekTo(seekTime);
  }

  function handleVolumeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newVolume = parseInt(target.value, 10);
    setVolume(newVolume);
    if (newVolume === 0) {
      mute();
    } else if (playerState.isMuted && newVolume > 0) {
      unMute();
    }
  }

  function toggleMute() {
    if (playerState.isMuted) {
      unMute();
      if (playerState.volume === 0) {
        setVolume(50);
      }
    } else {
      mute();
    }
  }

  function toggleFullscreen() {
    onToggleFullscreen?.();
  }

  function isFullscreenTouchGestureGuardActive(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }

    return playerState.isFullscreen && window.matchMedia(TOUCH_FULLSCREEN_QUERY).matches;
  }

  function stopControlEvent(event: Event) {
    event.stopPropagation();
  }

  function notifySeekInteractionStart() {
    if (isSeekInteractionActive) {
      return;
    }

    isSeekInteractionActive = true;
    onSeekInteractionStart?.();
  }

  function notifySeekInteractionEnd() {
    if (!isSeekInteractionActive) {
      return;
    }

    isSeekInteractionActive = false;
    onSeekInteractionEnd?.();
  }

  function handleSeekPointerDown(event: PointerEvent): void {
    stopControlEvent(event);
    notifySeekInteractionStart();

    if (!isFullscreenTouchGestureGuardActive() || event.pointerType !== 'touch') {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    target.setPointerCapture(event.pointerId);
  }

  function handleSeekPointerUp(event: PointerEvent): void {
    stopControlEvent(event);
    notifySeekInteractionEnd();

    if (event.pointerType !== 'touch') {
      return;
    }

    const target = event.currentTarget as HTMLElement | null;
    if (!target || !target.hasPointerCapture(event.pointerId)) {
      return;
    }

    target.releasePointerCapture(event.pointerId);
  }

  function handleSeekTouchGuard(event: TouchEvent): void {
    stopControlEvent(event);

    if (!isFullscreenTouchGestureGuardActive() || !event.cancelable) {
      return;
    }

    event.preventDefault();
  }

  function handleSeekTouchStart(event: TouchEvent): void {
    stopControlEvent(event);
    notifySeekInteractionStart();
  }

  function handleSeekTouchEnd(event: TouchEvent): void {
    stopControlEvent(event);
    notifySeekInteractionEnd();
  }

  $effect(() => {
    const seekBar = seekBarElement;

    if (!seekBar) {
      return;
    }

    seekBar.addEventListener('touchstart', handleSeekTouchGuard, { passive: false });
    seekBar.addEventListener('touchmove', handleSeekTouchGuard, { passive: false });

    return () => {
      seekBar.removeEventListener('touchstart', handleSeekTouchGuard);
      seekBar.removeEventListener('touchmove', handleSeekTouchGuard);
    };
  });

  function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds === null || seconds === undefined) {
      seconds = 0;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;
    return `${minutes}:${formattedSeconds}`;
  }
</script>

<div class="controls-container">
  <div class="progress-row">
    <div class="time-display">{formatTime(playerState.currentTime)}</div>
    <input
      bind:this={seekBarElement}
      type="range"
      min="0"
      max={playerState.duration}
      value={playerState.currentTime}
      step="0.1"
      data-tv-player-nav-id={seekNavId}
      aria-label="Seek video"
      oninput={handleSeek}
      onpointerdown={handleSeekPointerDown}
      onpointermove={stopControlEvent}
      onpointerup={handleSeekPointerUp}
      onpointercancel={handleSeekPointerUp}
      ontouchstart={handleSeekTouchStart}
      ontouchend={handleSeekTouchEnd}
      ontouchcancel={handleSeekTouchEnd}
      class="seek-bar"
      style="--progress: {(playerState.currentTime / playerState.duration) * 100 ||
        0}%; --buffered: {(playerState.buffered / playerState.duration) * 100 || 0}%;"
    />
    <div class="time-display">{formatTime(playerState.duration)}</div>
  </div>

  <div class="actions-row">
    <button
      class="play-pause-btn"
      onclick={togglePlayPause}
      data-tv-player-nav-id={playPauseNavId}
      aria-label={playerState.isPlaying ? $LL.controls.pause() : $LL.controls.play()}
      title={playerState.isPlaying ? $LL.controls.pause() : $LL.controls.play()}
    >
      {#if playerState.isPlaying}
        <IconPause size="20" weight="bold" />
      {:else}
        <IconPlay size="20" weight="bold" />
      {/if}
    </button>

    <div class="volume-controls">
      <button
        class="volume-btn"
        onclick={toggleMute}
        data-tv-player-nav-id={muteNavId}
        aria-label={playerState.isMuted || playerState.volume === 0
          ? $LL.controls.unmute()
          : $LL.controls.mute()}
        title={playerState.isMuted || playerState.volume === 0
          ? $LL.controls.unmute()
          : $LL.controls.mute()}
      >
        {#if playerState.isMuted || playerState.volume === 0}
          <SpeakerSlash size="20" weight="bold" />
        {:else}
          <SpeakerHigh size="20" weight="bold" />
        {/if}
      </button>
      <input
        type="range"
        min="0"
        max="100"
        bind:value={playerState.volume}
        oninput={handleVolumeChange}
        class="volume-bar"
        style="--volume-progress: {playerState.volume || 0}%;"
      />
    </div>

    <div class="subtitles-controls">
      <button
        class="subtitles-btn"
        data-tv-player-nav-id={originalSubtitleNavId}
        onclick={() => {
          if (playerState.lyricsAreSynced) {
            toggleOriginalSubtitleVisibility();
          }
        }}
        disabled={!playerState.lyricsAreSynced}
        title={playerState.showOriginalSubtitle
          ? $LL.lyrics.hideOriginal()
          : $LL.lyrics.showOriginal()}
      >
        {#if playerState.showOriginalSubtitle}
          <Eye size="20" weight="bold" />
        {:else}
          <EyeSlash size="20" weight="bold" />
        {/if}
        <span>{$LL.controls.original()}</span>
      </button>
      <button
        class="subtitles-btn"
        data-tv-player-nav-id={translatedSubtitleNavId}
        onclick={() => {
          if (playerState.lyricsAreSynced) {
            playerState.showTranslatedSubtitle = !playerState.showTranslatedSubtitle;
          }
        }}
        disabled={!playerState.lyricsAreSynced}
        title={playerState.showTranslatedSubtitle
          ? $LL.lyrics.hideTranslated()
          : $LL.lyrics.showTranslated()}
      >
        {#if playerState.showTranslatedSubtitle}
          <Eye size="20" weight="bold" />
        {:else}
          <EyeSlash size="20" weight="bold" />
        {/if}
        <span>{$LL.controls.translated()}</span>
      </button>
    </div>

    <button
      class="fullscreen-btn"
      onclick={toggleFullscreen}
      data-tv-player-nav-id={fullscreenNavId}
      aria-label={playerState.isFullscreen
        ? $LL.controls.exitFullscreen()
        : $LL.controls.enterFullscreen()}
      title={playerState.isFullscreen
        ? $LL.controls.exitFullscreen()
        : $LL.controls.enterFullscreen()}
    >
      {#if playerState.isFullscreen}
        <ArrowsInSimpleIcon size="20" weight="bold" />
      {:else}
        <ArrowsOutSimpleIcon size="20" weight="bold" />
      {/if}
    </button>
  </div>
</div>

<style>
  .controls-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding: 8px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    box-sizing: border-box;
  }

  .progress-row,
  .actions-row {
    display: flex;
    align-items: center;
    width: 100%;
  }

  .actions-row {
    gap: 0.35rem;
  }

  .play-pause-btn,
  .volume-btn,
  .fullscreen-btn,
  .subtitles-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s ease;
    border-radius: 50%;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .play-pause-btn:hover,
  .volume-btn:hover,
  .fullscreen-btn:hover,
  .subtitles-btn:hover:not(:disabled) {
    background-color: rgba(var(--primary-color-rgb), 0.3);
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  }

  .subtitles-btn:disabled {
    cursor: not-allowed;
    opacity: 0.4;
    pointer-events: none;
  }

  :global(.play-pause-btn[data-tv-player-active='true']),
  :global(.volume-btn[data-tv-player-active='true']),
  :global(.fullscreen-btn[data-tv-player-active='true']),
  :global(.subtitles-btn[data-tv-player-active='true']),
  :global(.seek-bar[data-tv-player-active='true']) {
    outline: var(--tv-focus-ring, 3px solid rgba(var(--primary-color-rgb), 0.95));
    outline-offset: 3px;
    box-shadow: var(--tv-focus-shadow, 0 0 0 6px rgba(var(--primary-color-rgb), 0.2));
    background-color: rgba(var(--primary-color-rgb), 0.26);
    transform: var(--tv-focus-lift, translateY(-1px) scale(1.01));
  }

  :global(.seek-bar[data-tv-player-active='true']) {
    opacity: 1;
  }

  :global(html.tv-mode) .play-pause-btn:hover,
  :global(html.tv-mode) .volume-btn:hover,
  :global(html.tv-mode) .fullscreen-btn:hover,
  :global(html.tv-mode) .subtitles-btn:hover:not(:disabled) {
    background-color: transparent;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  }

  .subtitles-controls {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    margin-left: auto;
  }

  .subtitles-btn {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 4px 8px;
    border-radius: 5px;
  }
  .fullscreen-btn {
    margin-left: 0.25rem;
  }

  .time-display {
    font-size: 0.9rem;
    min-width: 40px;
    text-align: center;
  }

  .seek-bar {
    flex-grow: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    background:
      linear-gradient(135deg, var(--primary-color), var(--secondary-color)) no-repeat 0% 0% /
        var(--progress, 0%) 100%,
      linear-gradient(to right, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)) no-repeat 0%
        0% / var(--buffered, 0%) 100%,
      #555;
    outline: none;
    opacity: 0.7;
    transition: opacity 0.2s;
    margin: 0 8px;
    border-radius: 4px;
    cursor: pointer;
  }

  .seek-bar:hover {
    opacity: 1;
  }

  .seek-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
  }

  .seek-bar:hover::-webkit-slider-thumb {
    transform: scale(1.2);
  }

  .seek-bar::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
  }

  .seek-bar:hover::-moz-range-thumb {
    transform: scale(1.2);
  }

  .volume-bar {
    width: 80px;
    -webkit-appearance: none;
    appearance: none;
    height: 4px;
    background:
      linear-gradient(
        to right,
        transparent var(--volume-progress, 0%),
        #555 var(--volume-progress, 0%)
      ),
      linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    outline: none;
    opacity: 0.7;
    transition: opacity 0.2s;
    margin-left: 0;
    border-radius: 4px;
    cursor: pointer;
  }

  .volume-bar:hover {
    opacity: 1;
  }

  .volume-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    cursor: pointer;
  }

  .volume-bar::-moz-range-thumb {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    cursor: pointer;
  }

  .volume-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  @media (max-width: 768px) {
    .subtitles-controls {
      display: none;
    }

    :global(.player-container.fullscreen) .subtitles-controls {
      display: flex;
    }

    .controls-container {
      padding: 4px;
      gap: 0.3rem;
    }

    .volume-bar {
      display: none;
    }

    .actions-row {
      gap: 0.2rem;
    }

    .time-display {
      font-size: 0.8rem;
      min-width: 35px;
    }

    .seek-bar {
      margin: 0 4px;
    }
  }

  @media (max-width: 768px) and (pointer: coarse) {
    :global(.player-container.fullscreen) .controls-container {
      padding-top: 6px;
      padding-bottom: max(10px, calc(env(safe-area-inset-bottom, 0px) + 6px));
      padding-left: max(18px, calc(env(safe-area-inset-left, 0px) + 10px));
      padding-right: max(18px, calc(env(safe-area-inset-right, 0px) + 10px));
    }

    :global(.player-container.fullscreen) .seek-bar {
      margin-left: 8px;
      margin-right: 8px;
      touch-action: none;
    }
  }
</style>
