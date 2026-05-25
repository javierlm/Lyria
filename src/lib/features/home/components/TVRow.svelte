<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    title: string;
    subtitle?: string;
    actionLabel?: string;
    onaction?: () => void | Promise<void>;
    children: Snippet;
  }

  let { title, subtitle, actionLabel, onaction, children }: Props = $props();
</script>

<section class="tv-row">
  <div class="tv-row-header">
    <div class="tv-row-copy">
      <h2>{title}</h2>
      {#if subtitle}
        <p>{subtitle}</p>
      {/if}
    </div>

    {#if actionLabel && onaction}
      <button type="button" class="tv-row-action" onclick={onaction}>
        {actionLabel}
      </button>
    {/if}
  </div>

  <div class="tv-row-content">
    {@render children()}
  </div>
</section>

<style>
  .tv-row {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .tv-row-header {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }

  .tv-row-copy {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
  }

  .tv-row-copy h2 {
    margin: 0;
    font-size: clamp(1.35rem, 1.4vw, 1.8rem);
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .tv-row-copy p {
    margin: 0;
    font-size: 0.95rem;
    color: color-mix(in srgb, var(--text-color) 72%, transparent);
  }

  .tv-row-action {
    border: 1px solid rgba(var(--primary-color-rgb), 0.25);
    background: rgba(var(--primary-color-rgb), 0.08);
    color: var(--text-color);
    border-radius: 999px;
    padding: 0.7rem 1rem;
    font-size: 0.86rem;
    font-weight: 700;
    cursor: pointer;
    transition:
      border-color 0.18s ease,
      background-color 0.18s ease,
      transform 0.18s ease;
  }

  .tv-row-action:hover {
    border-color: var(--primary-color);
    background: rgba(var(--primary-color-rgb), 0.14);
  }

  .tv-row-action:focus-visible {
    outline: var(--tv-focus-ring, 3px solid rgba(var(--primary-color-rgb), 0.95));
    outline-offset: 3px;
    box-shadow: var(--tv-focus-shadow, 0 0 0 6px rgba(var(--primary-color-rgb), 0.2));
  }

  .tv-row-content {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(260px, 19vw);
    gap: 1rem;
    overflow-x: auto;
    overflow-y: visible;
    padding-inline: 0.45rem;
    padding-top: 0.45rem;
    padding-bottom: 0.55rem;
    scroll-padding-inline: 0.45rem;
    scrollbar-width: thin;
    scrollbar-color: rgba(var(--primary-color-rgb), 0.65) transparent;
  }

  .tv-row-content::-webkit-scrollbar {
    height: 10px;
  }

  .tv-row-content::-webkit-scrollbar-thumb {
    background: rgba(var(--primary-color-rgb), 0.45);
    border-radius: 999px;
  }

  .tv-row-content::-webkit-scrollbar-track {
    background: transparent;
  }

  @media (max-width: 1200px) {
    .tv-row-content {
      grid-auto-columns: minmax(240px, 30vw);
    }
  }

  @media (max-width: 768px) {
    .tv-row-header {
      flex-direction: column;
      align-items: start;
    }

    .tv-row-content {
      grid-auto-columns: minmax(220px, 72vw);
    }
  }
</style>
