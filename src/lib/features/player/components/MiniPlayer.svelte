<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    isMiniMode,
    transform = 'none',
    controls,
    children,
    onPointerDown,
    onPointerMove,
    onPointerUp
  }: {
    isMiniMode: boolean;
    transform?: string;
    controls?: Snippet;
    children?: Snippet;
    onPointerDown?: (event: PointerEvent) => void;
    onPointerMove?: (event: PointerEvent) => void;
    onPointerUp?: (event: PointerEvent) => void;
  } = $props();
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="video-wrapper"
  class:mobile-video-wrapper={true}
  class:mini-mode={isMiniMode}
  style:transform
  style:transform-origin="bottom right"
  onpointerdown={onPointerDown}
  onpointermove={onPointerMove}
  onpointerup={onPointerUp}
  onpointercancel={onPointerUp}
  onlostpointercapture={onPointerUp}
>
  {@render controls?.()}
  {@render children?.()}
</div>

<style>
  .video-wrapper {
    width: 100%;
    margin: 0 auto;
    box-sizing: border-box;
  }

  .mobile-video-wrapper {
    width: 100%;
    max-width: none;
    margin-bottom: 0;
    padding: 0 1rem;
    margin-top: 0.5rem;
  }

  .mobile-video-wrapper.mini-mode {
    position: fixed;
    bottom: calc(100px + env(safe-area-inset-bottom, 0px));
    right: 16px;
    width: 150px;
    padding: 0;
    margin: 0;
    aspect-ratio: 16 / 9;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 2px solid rgba(255, 255, 255, 0.15);
    z-index: 70;
    touch-action: none;
  }

  .mobile-video-wrapper.mini-mode :global(.video-controls-wrapper) {
    display: none !important;
  }
</style>
