<script lang="ts">
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { toggleImmersiveMode } from '$lib/features/player/services/playerActions';
  import PlayerView from '$lib/features/player/components/PlayerView.svelte';
  import ArrowUpIcon from 'phosphor-svelte/lib/ArrowUp';

  const isVisible = $derived(playerState.isImmersiveMode);
</script>

{#if isVisible}
  <div class="mini-player expanded" role="complementary" aria-label="Mini player">
    <button
      class="expand-button"
      onclick={toggleImmersiveMode}
      aria-label="Expand to immersive mode"
      title="Expand"
    >
      <ArrowUpIcon size={16} weight="bold" />
    </button>
    <div class="mini-player-video">
      <PlayerView loadingNavId="mini-player" />
    </div>
  </div>
{/if}

<style>
  .mini-player {
    position: fixed;
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
    right: 16px;
    width: 150px;
    aspect-ratio: 16 / 9;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 2px solid rgba(255, 255, 255, 0.15);
    z-index: 40;
    transition:
      transform 300ms cubic-bezier(0.4, 0, 0.2, 1),
      opacity 300ms cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform, opacity;
    transform: scale(1);
    opacity: 1;
  }

  .mini-player-video {
    width: 100%;
    height: 100%;
    pointer-events: auto;
  }

  .mini-player-video :global(.player-container) {
    border-radius: 0;
    width: 100%;
    height: 100%;
  }

  .expand-button {
    position: absolute;
    top: 4px;
    left: 4px;
    z-index: 50;
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    cursor: pointer;
    opacity: 0.8;
    transition: opacity 0.2s ease;
  }

  .expand-button:hover {
    opacity: 1;
  }
</style>
