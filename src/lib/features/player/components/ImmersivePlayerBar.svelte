<script lang="ts">
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { seekTo, play, pause, mute, unMute } from '$lib/features/player/services/playerActions';
  import LL from '$i18n/i18n-svelte';
  import PlayIcon from 'phosphor-svelte/lib/Play';
  import PauseIcon from 'phosphor-svelte/lib/Pause';
  import SpeakerHighIcon from 'phosphor-svelte/lib/SpeakerHigh';
  import SpeakerSlashIcon from 'phosphor-svelte/lib/SpeakerSlash';
  import HeartIcon from 'phosphor-svelte/lib/Heart';
  import { videoService } from '$lib/features/video/services/videoService';
  import { notify } from '$lib/features/notification';

  // ── State ──────────────────────────────────────────────────────────────
  let isFavorite = $state(false);
  let isLikeAnimating = $state(false);
  let isMounted = $state(false);

  // Animate in on mount
  $effect(() => {
    // Trigger on next frame so the element is rendered first
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isMounted = true;
      });
    });
  });

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

  function handleLikeClick() {
    toggleFavorite();
    isLikeAnimating = true;
    setTimeout(() => {
      isLikeAnimating = false;
    }, 800);
  }

  function handleToggleMute() {
    if (playerState.isMuted) {
      unMute();
    } else {
      mute();
    }
  }

  function handleTogglePlay() {
    if (playerState.isPlaying) {
      pause();
    } else {
      play();
    }
  }

  const progressPercent = $derived(
    playerState.duration > 0 ? (playerState.currentTime / playerState.duration) * 100 : 0
  );

  function handleProgressClick(event: MouseEvent) {
    const bar = (event.currentTarget as HTMLElement).querySelector(
      '.progress-track'
    ) as HTMLElement | null;
    if (!bar || playerState.duration <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    seekTo(ratio * playerState.duration);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="immersive-player-bar" class:entered={isMounted}>
  <!-- Progress bar -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="progress-bar"
    onclick={handleProgressClick}
    role="slider"
    tabindex="0"
    aria-label="Progress"
    aria-valuenow={Math.round(progressPercent)}
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="progress-track">
      <div class="progress-buffer" style="width: {(playerState.buffered / Math.max(playerState.duration, 1)) * 100}%"></div>
      <div class="progress-fill" style="width: {progressPercent}%"></div>
    </div>
  </div>

  <!-- Controls -->
  <div class="player-controls">
    <button
      class="control-button mute-button"
      onclick={handleToggleMute}
      aria-label={playerState.isMuted ? $LL.controls.unmute() : $LL.controls.mute()}
    >
      {#if playerState.isMuted}
        <SpeakerSlashIcon size={20} weight="regular" />
      {:else}
        <SpeakerHighIcon size={20} weight="regular" />
      {/if}
    </button>

    <button
      class="control-button play-button"
      onclick={handleTogglePlay}
      aria-label={playerState.isPlaying ? $LL.controls.pause() : $LL.controls.play()}
    >
      {#if playerState.isPlaying}
        <PauseIcon size={24} weight="fill" />
      {:else}
        <PlayIcon size={24} weight="fill" />
      {/if}
    </button>

    <button
      class="control-button like-button-immersive"
      class:animating={isLikeAnimating}
      onclick={handleLikeClick}
      aria-label={isFavorite ? $LL.notifications.removedFromFavorites() : $LL.notifications.addedToFavorites()}
    >
      <div
        class="heart-icon-wrapper"
        class:filled={isFavorite}
        class:ping={isLikeAnimating && isFavorite}
        class:shrink={isLikeAnimating && !isFavorite}
      >
        <HeartIcon size={20} weight={isFavorite ? 'fill' : 'regular'} color="currentColor" />
      </div>

      {#if isLikeAnimating && isFavorite}
        <div class="pulse-ring"></div>
        <div class="particle particle-1"></div>
        <div class="particle particle-2"></div>
        <div class="particle particle-3"></div>
      {/if}
    </button>
  </div>
</div>

<style>
  .immersive-player-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 60;
    padding: 0 1rem calc(8px + env(safe-area-inset-bottom, 0px));
    padding-top: 16px;
    background: linear-gradient(
      to top,
      var(--background-color, rgba(10, 10, 10, 0.95)) 60%,
      transparent 100%
    );
    transform: translateY(100%);
    opacity: 0;
    transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.4s ease;
  }

  .immersive-player-bar.entered {
    transform: translateY(0);
    opacity: 1;
  }

  /* Progress bar */
  .progress-bar {
    width: 100%;
    padding: 4px 0 12px;
    cursor: pointer;
  }

  .progress-track {
    position: relative;
    width: 100%;
    height: 4px;
    background: rgba(var(--primary-color-rgb), 0.16);
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-buffer {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: rgba(var(--primary-color-rgb), 0.28);
    border-radius: 999px;
    transition: width 0.3s ease;
  }

  .progress-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(135deg, var(--primary-color, #ef4444), var(--secondary-color, #d43b74));
    border-radius: 999px;
    transition: width 0.15s linear;
  }

  .progress-bar:hover .progress-track {
    height: 6px;
  }

  /* Player controls */
  .player-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
    padding-bottom: 4px;
  }

  .control-button {
    display: grid;
    place-items: center;
    border: none;
    cursor: pointer;
    color: color-mix(in srgb, var(--text-color) 72%, transparent);
    background: none;
    transition: color 0.2s ease, transform 0.15s ease;
    border-radius: 50%;
  }

  .control-button:hover {
    color: var(--primary-color);
  }

  .control-button:active {
    transform: scale(0.92);
  }

  .mute-button {
    width: 36px;
    height: 36px;
  }

  .play-button {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    border: 1px solid rgba(var(--primary-color-rgb), 0.36);
    color: var(--on-primary-color, #ffffff);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }

  .play-button:hover {
    background: linear-gradient(135deg, var(--primary-color-hover), var(--secondary-color));
    color: var(--on-primary-color, #ffffff);
    transform: scale(1.05);
  }

  :global(html.dark-mode) .progress-track {
    background: rgba(255, 255, 255, 0.12);
  }

  :global(html.dark-mode) .progress-buffer {
    background: rgba(255, 255, 255, 0.25);
  }

  :global(html.dark-mode) .control-button {
    color: rgba(255, 255, 255, 0.75);
  }

  :global(html.dark-mode) .control-button:hover {
    color: white;
  }

  :global(html.dark-mode) .play-button {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.15);
    color: white;
  }

  :global(html.dark-mode) .play-button:hover {
    background: rgba(255, 255, 255, 0.18);
    color: white;
  }

  .play-button:active {
    transform: scale(0.95);
  }

  .like-button-immersive {
    width: 36px;
    height: 36px;
    position: relative;
  }

  .like-button-immersive.animating {
    transform: scale(0.95);
  }

  .heart-icon-wrapper {
    transition: all 0.5s ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .heart-icon-wrapper.filled {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    color: var(--primary-color, #ef4444);
  }

  .heart-icon-wrapper.ping {
    animation: ping-once 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .heart-icon-wrapper.shrink {
    animation: shrink 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  /* Pulse ring */
  .pulse-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, transparent 70%);
    animation: pulse-ring 0.6s ease-out forwards;
    pointer-events: none;
  }

  /* Particles */
  .particle {
    position: absolute;
    border-radius: 50%;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    pointer-events: none;
  }

  .particle-1 {
    top: -0.25rem;
    right: -0.25rem;
    width: 1rem;
    height: 1rem;
    background: #fbbf24;
    animation: float-1 0.6s ease-out forwards;
  }

  .particle-2 {
    top: -0.5rem;
    left: 1rem;
    width: 0.75rem;
    height: 0.75rem;
    background: #fb923c;
    animation: float-2 0.7s ease-out forwards;
  }

  .particle-3 {
    bottom: -0.25rem;
    left: -0.25rem;
    width: 0.75rem;
    height: 0.75rem;
    background: #fbbf24;
    animation: float-3 0.65s ease-out forwards;
  }

  /* Animations */
  @keyframes ping-once {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    40% {
      transform: scale(1.25);
      opacity: 0.9;
    }
    60% {
      transform: scale(0.95);
      opacity: 1;
    }
    80% {
      transform: scale(1.05);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes shrink {
    0% {
      transform: scale(1);
    }
    40% {
      transform: scale(0.75);
    }
    70% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
    }
  }

  @keyframes pulse-ring {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    100% {
      transform: scale(1.8);
      opacity: 0;
    }
  }

  @keyframes float-1 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(12px, -20px) scale(0);
      opacity: 0;
    }
  }

  @keyframes float-2 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(-10px, -22px) scale(0);
      opacity: 0;
    }
  }

  @keyframes float-3 {
    0% {
      transform: translate(0, 0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(-14px, 12px) scale(0);
      opacity: 0;
    }
  }
</style>
