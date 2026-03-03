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
    unMute
  } from '$lib/features/player/services/playerActions';

  interface Props {
    onToggleFullscreen?: () => void;
    onSeekInteractionStart?: () => void;
    onSeekInteractionEnd?: () => void;
  }

  let { onToggleFullscreen, onSeekInteractionStart, onSeekInteractionEnd }: Props = $props();
  const LANDSCAPE_TOUCH_FULLSCREEN_QUERY =
    '(max-width: 768px) and (orientation: landscape) and (pointer: coarse)';

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

    return playerState.isFullscreen && window.matchMedia(LANDSCAPE_TOUCH_FULLSCREEN_QUERY).matches;
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
  <button
    class="play-pause-btn"
    onclick={togglePlayPause}
    aria-label={playerState.isPlaying ? $LL.controls.pause() : $LL.controls.play()}
    title={playerState.isPlaying ? $LL.controls.pause() : $LL.controls.play()}
  >
    {#if playerState.isPlaying}
      <IconPause size="20" weight="bold" />
    {:else}
      <IconPlay size="20" weight="bold" />
    {/if}
  </button>

  <div class="time-display">{formatTime(playerState.currentTime)}</div>
  <input
    bind:this={seekBarElement}
    type="range"
    min="0"
    max={playerState.duration}
    value={playerState.currentTime}
    step="0.1"
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

  <div class="volume-controls">
    <button
      class="volume-btn"
      onclick={toggleMute}
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
      onclick={() => {
        if (playerState.lyricsAreSynced) {
          playerState.showOriginalSubtitle = !playerState.showOriginalSubtitle;
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

<style>
  .controls-container {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    display: flex;
    align-items: center;
    padding: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    box-sizing: border-box;
  }

  .play-pause-btn,
  .volume-btn,
  .fullscreen-btn,
  .subtitles-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 5px;
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

  .subtitles-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: auto;
  }

  .subtitles-btn {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 5px 10px;
    border-radius: 5px;
  }
  .fullscreen-btn {
    margin-left: 0.5rem;
  }

  .time-display {
    margin: 0 10px;
    font-size: 0.9rem;
    min-width: 40px;
    text-align: center;
  }

  .seek-bar {
    flex-grow: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 8px;
    background:
      linear-gradient(135deg, var(--primary-color), var(--secondary-color)) no-repeat 0% 0% /
        var(--progress, 0%) 100%,
      linear-gradient(to right, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.4)) no-repeat 0%
        0% / var(--buffered, 0%) 100%,
      #555;
    outline: none;
    opacity: 0.7;
    transition: opacity 0.2s;
    margin: 0 10px;
    border-radius: 4px;
    cursor: pointer;
  }

  .seek-bar:hover {
    opacity: 1;
  }

  .seek-bar::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    cursor: pointer;
    transition: transform 0.2s ease-in-out;
  }

  .seek-bar:hover::-webkit-slider-thumb {
    transform: scale(1.2);
  }

  .seek-bar::-moz-range-thumb {
    width: 20px;
    height: 20px;
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
    margin-left: 10px;
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
  }

  @media (max-width: 768px) {
    .subtitles-controls {
      display: none;
    }

    :global(.player-container.fullscreen) .subtitles-controls {
      display: flex;
    }

    .controls-container {
      padding: 5px;
    }

    .volume-bar {
      display: none;
    }

    .time-display {
      margin: 0 5px;
      font-size: 0.8rem;
      min-width: 35px;
    }

    .seek-bar {
      margin: 0 5px;
    }
  }

  @media (max-width: 768px) and (orientation: landscape) and (pointer: coarse) {
    :global(.player-container.fullscreen) .controls-container {
      padding-top: 10px;
      padding-bottom: max(14px, calc(env(safe-area-inset-bottom, 0px) + 10px));
      padding-left: max(22px, calc(env(safe-area-inset-left, 0px) + 14px));
      padding-right: max(22px, calc(env(safe-area-inset-right, 0px) + 14px));
    }

    :global(.player-container.fullscreen) .seek-bar {
      margin-left: 12px;
      margin-right: 12px;
      touch-action: none;
    }
  }
</style>
