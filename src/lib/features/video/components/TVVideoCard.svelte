<script lang="ts">
  import Heart from 'phosphor-svelte/lib/Heart';
  import Sparkle from 'phosphor-svelte/lib/Sparkle';
  import GlobeHemisphereWest from 'phosphor-svelte/lib/GlobeHemisphereWest';
  import type { VideoItem as SearchVideoItem } from '$lib/features/search/stores/searchStore.svelte';
  import LL from '$i18n/i18n-svelte';

  interface Props {
    video: SearchVideoItem;
    onclick?: () => void;
    priority?: boolean;
    featured?: boolean;
    tvNavId?: string;
  }

  let { video, onclick, priority = false, featured = false, tvNavId }: Props = $props();

  const badgeLabel = $derived.by(() => {
    if (video.source === 'ghost') {
      return $LL.video.unplayed();
    }

    if (video.isCatalogResult) {
      return $LL.video.globalResult();
    }

    return null;
  });
</script>

<button
  type="button"
  class="tv-video-card"
  class:featured
  {onclick}
  data-tv-nav-id={tvNavId}
  aria-label={`${video.artist} - ${video.track}`}
>
  <div class="poster-shell">
    {#if video.thumbnailUrl}
      <img
        src={video.thumbnailUrl}
        alt={video.track}
        class="poster"
        fetchpriority={priority ? 'high' : 'auto'}
        loading={priority ? 'eager' : 'lazy'}
      />
    {:else}
      <div class="poster poster-fallback">
        <span>{video.artist.slice(0, 1)}{video.track.slice(0, 1)}</span>
      </div>
    {/if}

    <div class="poster-overlay"></div>

    <div class="poster-meta">
      {#if badgeLabel}
        <span class="pill">{badgeLabel}</span>
      {/if}

      {#if video.isFavorite}
        <span class="icon-pill favorite-pill" aria-hidden="true">
          <Heart size={16} weight="fill" />
        </span>
      {/if}
    </div>
  </div>

  <div class="copy">
    <h3>{video.track}</h3>
    <p>{video.artist}</p>

    <div class="source-line">
      {#if video.source === 'ghost'}
        <Sparkle size={15} weight="fill" />
      {:else if video.isCatalogResult}
        <GlobeHemisphereWest size={15} weight="fill" />
      {:else if video.isFavorite}
        <Heart size={15} weight="fill" />
      {/if}

      <span>
        {#if video.source === 'ghost'}
          {video.ghostProvider ?? 'remote'}
        {:else if video.isCatalogResult}
          {$LL.video.globalResult()}
        {:else if video.isFavorite}
          {$LL.search.favorites()}
        {:else}
          &nbsp;
        {/if}
      </span>
    </div>
  </div>
</button>

<style>
  .tv-video-card {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    width: 100%;
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
    transition: transform 0.18s ease;
  }

  .poster-shell {
    position: relative;
    overflow: hidden;
    border-radius: 22px;
    border: 1px solid color-mix(in srgb, var(--border-color) 72%, white 10%);
    background: color-mix(in srgb, var(--card-background) 92%, black 8%);
    box-shadow: 0 18px 34px rgba(0, 0, 0, 0.16);
    aspect-ratio: 16 / 9;
  }

  .tv-video-card.featured .poster-shell {
    border-radius: 28px;
  }

  .poster {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .poster-fallback {
    display: grid;
    place-items: center;
    background:
      radial-gradient(circle at top, rgba(var(--primary-color-rgb), 0.34), transparent 48%),
      linear-gradient(160deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.18)),
      var(--card-background);
    font-size: 2rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .poster-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 35%, rgba(10, 12, 18, 0.6) 100%);
    pointer-events: none;
  }

  .poster-meta {
    position: absolute;
    inset: auto 0 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 1rem;
    z-index: 1;
  }

  .pill,
  .icon-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    border-radius: 999px;
    backdrop-filter: blur(10px);
  }

  .pill {
    padding: 0.3rem 0.7rem;
    background: rgba(10, 12, 18, 0.58);
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .icon-pill {
    width: 30px;
    color: white;
    background: rgba(10, 12, 18, 0.5);
  }

  .favorite-pill {
    color: #ff7b7b;
  }

  .copy {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
    padding-inline: 0.15rem;
  }

  .copy h3,
  .copy p {
    margin: 0;
  }

  .copy h3 {
    font-size: 1rem;
    font-weight: 800;
    line-height: 1.25;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .copy p {
    font-size: 0.92rem;
    color: color-mix(in srgb, var(--text-color) 74%, transparent);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .source-line {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 1rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: color-mix(in srgb, var(--text-color) 64%, transparent);
    text-transform: capitalize;
  }

  .tv-video-card:hover .poster-shell {
    border-color: rgba(var(--primary-color-rgb), 0.6);
    box-shadow: 0 22px 42px rgba(0, 0, 0, 0.22);
  }

  :global(html.tv-mode) .tv-video-card:hover {
    transform: none;
  }

  :global(html.tv-mode) .tv-video-card:hover .poster-shell {
    border-color: color-mix(in srgb, var(--border-color) 72%, white 10%);
    box-shadow: 0 18px 34px rgba(0, 0, 0, 0.16);
  }

  .tv-video-card:focus-visible {
    outline: none;
  }

  :global(.tv-video-card[data-tv-active='true']) {
    outline: none;
    transform: var(--tv-focus-lift, translateY(-1px) scale(1.01));
  }

  :global(.tv-video-card[data-tv-active='true'] .poster-shell),
  .tv-video-card:focus-visible .poster-shell {
    outline: var(--tv-focus-ring, 3px solid rgba(var(--primary-color-rgb), 0.95));
    outline-offset: 3px;
    box-shadow: var(--tv-focus-shadow, 0 0 0 6px rgba(var(--primary-color-rgb), 0.2));
    border-color: rgba(var(--primary-color-rgb), 0.85);
  }

  @media (max-width: 768px) {
    .poster-shell {
      border-radius: 18px;
    }
  }
</style>
