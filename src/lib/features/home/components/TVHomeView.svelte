<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { flip } from 'svelte/animate';
  import { fade } from 'svelte/transition';
  import Sparkle from 'phosphor-svelte/lib/Sparkle';
  import FilmStrip from 'phosphor-svelte/lib/FilmStrip';
  import Logo from '$lib/features/ui/components/Logo.svelte';
  import SearchForm from '$lib/features/search/components/search/SearchForm.svelte';
  import TVRow from '$lib/features/home/components/TVRow.svelte';
  import TVVideoCard from '$lib/features/video/components/TVVideoCard.svelte';

  const TOP_CONTROL_FOCUS_EVENT = 'lyria:focus-top-controls';
  const PAGE_TV_CONTENT_FOCUS_EVENT = 'lyria:focus-page-tv-content';
  import SongOfTheDayCard from '$lib/features/song-of-the-day/components/SongOfTheDayCard.svelte';
  import SongOfTheDaySkeleton from '$lib/features/song-of-the-day/components/SongOfTheDaySkeleton.svelte';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { searchStore } from '$lib/features/search/stores/searchStore.svelte';
  import LL from '$i18n/i18n-svelte';
  import type { VideoItem } from '$lib/features/search/stores/searchStore.svelte';
  import { onMount, tick } from 'svelte';

  interface NavigationSection {
    id: string;
    itemIds: string[];
  }

  let inputRef = $state<HTMLInputElement | null>(null);
  let rootElement = $state<HTMLElement | null>(null);
  let activeElement = $state<HTMLElement | null>(null);
  let focusedSectionIndex = $state(0);
  let focusedItemIndex = $state(0);
  let lastFocusedItemBySection = $state<Record<string, number>>({});

  const playRoute = resolve('/play');

  const query = $derived(searchStore.searchValue.trim());
  const hasSearchQuery = $derived(query.length > 0);
  const isSearchBusy = $derived(searchStore.isFetchingGhost || searchStore.isLoadingMoreGhost);
  const favoriteVideos = $derived(searchStore.recentVideos.filter((video) => video.isFavorite));
  const hasRecentVideos = $derived(searchStore.recentVideos.length > 0);
  const hasFavoriteVideos = $derived(favoriteVideos.length > 0);
  const localResults = $derived(
    hasSearchQuery ? searchStore.filteredVideos.filter((video) => video.source !== 'ghost') : []
  );
  const ghostResults = $derived(
    hasSearchQuery ? searchStore.filteredVideos.filter((video) => video.source === 'ghost') : []
  );
  const hasGhostResults = $derived(ghostResults.length > 0);
  const totalSearchResults = $derived(localResults.length + ghostResults.length);
  const sectionOrder = $derived.by(() => {
    const sections: NavigationSection[] = [
      {
        id: 'hero',
        itemIds: [
          'hero-search-input',
          'hero-search-submit',
          ...(hasSearchQuery ? ['hero-clear-search'] : []),
          'hero-song'
        ]
      }
    ];

    if (hasSearchQuery) {
      sections.push({
        id: 'results',
        itemIds:
          localResults.length > 0
            ? localResults.map((video) => `results:${video.videoId}`)
            : ['results-empty']
      });

      if (hasGhostResults) {
        sections.push({
          id: 'ghost-results',
          itemIds: [
            ...ghostResults.map((video) => `ghost-results:${video.videoId}`),
            ...(searchStore.canLoadMoreGhost ? ['ghost-results:load-more'] : [])
          ]
        });
      }
    }

    if (hasRecentVideos) {
      sections.push({
        id: 'recent',
        itemIds: searchStore.recentVideos.map((video) => `recent:${video.videoId}`)
      });
    }

    if (hasFavoriteVideos) {
      sections.push({
        id: 'favorites',
        itemIds: favoriteVideos.map((video) => `favorites:${video.videoId}`)
      });
    }

    return sections;
  });

  function getElementByNavId(navId: string): HTMLElement | null {
    return rootElement?.querySelector(`[data-tv-nav-id="${navId}"]`) ?? null;
  }

  async function recoverLogicalFocus(scroll = false): Promise<void> {
    const activeNavId = activeElement?.dataset.tvNavId;
    if (activeNavId && getElementByNavId(activeNavId)) {
      await focusByNavId(activeNavId, scroll);
      return;
    }

    const currentNavId = getCurrentNavId();
    if (currentNavId && getElementByNavId(currentNavId)) {
      await focusByNavId(currentNavId, scroll);
      return;
    }

    await focusByNavId('hero-search-input', scroll);
  }

  function applyActiveElement(nextElement: HTMLElement | null): void {
    if (activeElement && activeElement !== nextElement) {
      activeElement.removeAttribute('data-tv-active');
    }

    activeElement = nextElement;

    if (activeElement) {
      activeElement.setAttribute('data-tv-active', 'true');
    }
  }

  function getCurrentNavId(): string | null {
    const section = sectionOrder[focusedSectionIndex];
    return section?.itemIds[focusedItemIndex] ?? null;
  }

  function getCurrentSectionId(): string {
    return sectionOrder[focusedSectionIndex]?.id ?? 'hero';
  }

  async function focusByIndices(
    sectionIndex: number,
    itemIndex: number,
    scroll = true
  ): Promise<void> {
    await tick();

    const nextSection = sectionOrder[sectionIndex];
    if (!nextSection) return;

    const clampedItemIndex = Math.max(0, Math.min(itemIndex, nextSection.itemIds.length - 1));
    const navId = nextSection.itemIds[clampedItemIndex];
    const element = navId ? getElementByNavId(navId) : null;

    if (!element) return;

    focusedSectionIndex = sectionIndex;
    focusedItemIndex = clampedItemIndex;
    lastFocusedItemBySection = {
      ...lastFocusedItemBySection,
      [nextSection.id]: clampedItemIndex
    };

    applyActiveElement(element);
    element.focus({ preventScroll: true });

    if (scroll) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  async function focusByNavId(navId: string, scroll = true): Promise<void> {
    for (let sectionIndex = 0; sectionIndex < sectionOrder.length; sectionIndex += 1) {
      const itemIndex = sectionOrder[sectionIndex].itemIds.indexOf(navId);
      if (itemIndex >= 0) {
        await focusByIndices(sectionIndex, itemIndex, scroll);
        return;
      }
    }
  }

  function handleFocusIn(event: FocusEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const focusable = target.closest<HTMLElement>('[data-tv-nav-id]');
    if (!focusable) return;

    const navId = focusable.dataset.tvNavId;
    if (!navId) return;

    for (let sectionIndex = 0; sectionIndex < sectionOrder.length; sectionIndex += 1) {
      const itemIndex = sectionOrder[sectionIndex].itemIds.indexOf(navId);
      if (itemIndex >= 0) {
        focusedSectionIndex = sectionIndex;
        focusedItemIndex = itemIndex;
        lastFocusedItemBySection = {
          ...lastFocusedItemBySection,
          [sectionOrder[sectionIndex].id]: itemIndex
        };
        applyActiveElement(focusable);
        return;
      }
    }
  }

  async function moveHorizontal(delta: number): Promise<void> {
    const section = sectionOrder[focusedSectionIndex];
    if (!section) return;

    const nextItemIndex = Math.max(
      0,
      Math.min(focusedItemIndex + delta, section.itemIds.length - 1)
    );
    if (nextItemIndex === focusedItemIndex) return;

    await focusByIndices(focusedSectionIndex, nextItemIndex);
  }

  async function moveVertical(delta: number): Promise<void> {
    const nextSectionIndex = Math.max(
      0,
      Math.min(focusedSectionIndex + delta, sectionOrder.length - 1)
    );
    if (nextSectionIndex === focusedSectionIndex) {
      if (delta < 0) {
        window.dispatchEvent(new CustomEvent(TOP_CONTROL_FOCUS_EVENT));
      }

      return;
    }

    const nextSection = sectionOrder[nextSectionIndex];
    const preferredItemIndex = lastFocusedItemBySection[nextSection.id] ?? focusedItemIndex;
    await focusByIndices(nextSectionIndex, preferredItemIndex);
  }

  async function clearSearchAndRefocus(): Promise<void> {
    searchStore.reset();
    searchStore.loadRecentVideos();
    inputRef?.blur();
    await focusByNavId('hero-search-input', false);
  }

  async function focusSearchEntryPoint(): Promise<void> {
    const preferredTarget =
      localResults.length > 0
        ? `results:${localResults[0].videoId}`
        : ghostResults.length > 0
          ? `ghost-results:${ghostResults[0].videoId}`
          : 'results-empty';

    if (getElementByNavId(preferredTarget)) {
      await focusByNavId(preferredTarget);
      return;
    }

    if (getElementByNavId('hero-search-input')) {
      await focusByNavId('hero-search-input');
    }
  }

  function isBackKey(event: KeyboardEvent): boolean {
    return (
      event.key === 'Escape' ||
      event.key === 'BrowserBack' ||
      event.key === 'GoBack' ||
      event.key === 'Backspace' ||
      event.keyCode === 10009
    );
  }

  async function handleKeydown(event: KeyboardEvent): Promise<void> {
    if (event.altKey || event.ctrlKey || event.metaKey) return;

    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest('[data-tv-top-nav-id]')) {
      return;
    }

    const isInput = target instanceof HTMLInputElement;

    if (event.key === 'Enter' && !isInput) {
      const current =
        activeElement ??
        (getCurrentNavId() ? getElementByNavId(getCurrentNavId() as string) : null);
      if (current) {
        event.preventDefault();
        current.click();
      }
      return;
    }

    if (isBackKey(event)) {
      const currentSectionId = getCurrentSectionId();

      if (hasSearchQuery && currentSectionId !== 'hero') {
        event.preventDefault();
        await focusByNavId('hero-search-input');
        return;
      }

      if (hasSearchQuery) {
        event.preventDefault();
        await clearSearchAndRefocus();
      }
      return;
    }

    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      return;
    }

    event.preventDefault();

    await recoverLogicalFocus(false);

    if (event.key === 'ArrowLeft') {
      await moveHorizontal(-1);
      return;
    }

    if (event.key === 'ArrowRight') {
      await moveHorizontal(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      await moveVertical(-1);
      return;
    }

    if (event.key === 'ArrowDown' && isInput && hasSearchQuery) {
      await focusSearchEntryPoint();
      return;
    }

    await moveVertical(1);
  }

  onMount(() => {
    const handleFocusPageTvContent = () => {
      void recoverLogicalFocus(false);
    };

    searchStore.loadRecentVideos();

    tick().then(() => {
      void focusByNavId('hero-search-input', false);
    });

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener(PAGE_TV_CONTENT_FOCUS_EVENT, handleFocusPageTvContent);

    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener(PAGE_TV_CONTENT_FOCUS_EVENT, handleFocusPageTvContent);
      applyActiveElement(null);
    };
  });

  $effect(() => {
    sectionOrder;

    if (!rootElement) return;

    queueMicrotask(() => {
      const activeNavId = activeElement?.dataset.tvNavId;
      if (activeNavId) {
        void focusByNavId(activeNavId, false);
        return;
      }

      const currentNavId = getCurrentNavId();
      if (!currentNavId || !getElementByNavId(currentNavId)) {
        void focusByIndices(
          Math.min(focusedSectionIndex, Math.max(sectionOrder.length - 1, 0)),
          0,
          false
        );
      }
    });
  });

  function openVideo(video: VideoItem): void {
    playerState.preferredSearchMetadata = {
      videoId: video.videoId,
      artist: video.artist,
      track: video.track,
      source: 'clicked'
    };

    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(`${playRoute}?id=${encodeURIComponent(video.videoId)}`, { noScroll: true });
  }

  function clearSearch(): void {
    void clearSearchAndRefocus();
  }

  async function loadMoreResults(): Promise<void> {
    await searchStore.loadMoreGhostResults();
  }
</script>

<div class="tv-home-view" bind:this={rootElement} onfocusin={handleFocusIn}>
  <section class="tv-hero">
    <div class="hero-copy">
      <div class="hero-brand">
        <Logo />
      </div>

      <div class="hero-intro">
        <span class="hero-kicker">TV Mode</span>
        <p>
          {#if hasSearchQuery}
            {#if searchStore.filteredVideos.length > 0}
              {searchStore.filteredVideos.length} results for &quot;{query}&quot;
            {:else}
              {$LL.search.noResults()}
            {/if}
          {:else}
            Search by artist, song title or YouTube link.
          {/if}
        </p>
      </div>

      <div class="hero-search-surface">
        <SearchForm
          centered={true}
          bind:inputRef
          inputNavId="hero-search-input"
          submitNavId="hero-search-submit"
        />

        {#if hasSearchQuery}
          <div class="search-status-banner" class:is-busy={isSearchBusy}>
            {#if searchStore.filteredVideos.length > 0}
              <strong>{totalSearchResults}</strong>
              <span>matching videos ready to explore</span>
            {:else if isSearchBusy}
              <strong>Searching</strong>
              <span>Checking local and remote matches for &quot;{query}&quot;</span>
            {:else}
              <strong>{$LL.search.noResults()}</strong>
              <span>{$LL.search.searchHint()}</span>
            {/if}
          </div>
        {/if}

        {#if hasSearchQuery}
          <button
            type="button"
            class="hero-reset-button"
            onclick={clearSearch}
            data-tv-nav-id="hero-clear-search"
          >
            Clear search
          </button>
        {/if}
      </div>
    </div>

    <section class="hero-song-of-day">
      <div class="hero-song-copy">
        <h2>Daily pick</h2>
        <p>A curated video to discover something great before you even search.</p>
      </div>

      <div class="hero-song-card-shell">
        <SongOfTheDayCard navId="hero-song">
          {#snippet skeleton()}
            <SongOfTheDaySkeleton />
          {/snippet}
        </SongOfTheDayCard>
      </div>
    </section>
  </section>

  <div class="tv-sections">
    {#each sectionOrder as section (section.id)}
      <div
        class="tv-section"
        class:search-secondary={hasSearchQuery &&
          (section.id === 'recent' || section.id === 'favorites')}
        data-tv-section={section.id}
        animate:flip={{ duration: 180 }}
        in:fade={{ duration: 140 }}
        out:fade={{ duration: 120 }}
      >
        {#if section.id === 'results'}
          <TVRow
            title={$LL.tvHome.searchResults()}
            subtitle={isSearchBusy
              ? $LL.tvHome.searchingSubtitle()
              : $LL.tvHome.resultsSubtitle()}
          >
            {#if localResults.length > 0}
              {#each localResults as video, index (video.videoId)}
                <TVVideoCard
                  {video}
                  priority={index < 2}
                  onclick={() => openVideo(video)}
                  tvNavId={`results:${video.videoId}`}
                />
              {/each}
            {:else if isSearchBusy}
              <div
                class="empty-row-card loading-row-card"
                tabindex="-1"
                data-tv-nav-id="results-empty"
              >
                <Sparkle size={28} weight="duotone" />
                <strong>{$LL.tvHome.searchingForMatches()}</strong>
                <span>{$LL.tvHome.searchingForMatchesDetail({ query })}</span>
              </div>
            {:else}
              <div class="empty-row-card" tabindex="-1" data-tv-nav-id="results-empty">
                <Sparkle size={28} weight="duotone" />
                <strong>{$LL.search.noResults()}</strong>
                <span>{$LL.search.searchHint()}</span>
              </div>
            {/if}
          </TVRow>
        {:else if section.id === 'ghost-results'}
          <TVRow
            title={$LL.search.alsoInterested()}
            subtitle={$LL.tvHome.ghostResultsSubtitle()}
          >
            {#each ghostResults as video, index (video.videoId)}
              <TVVideoCard
                {video}
                priority={index < 2}
                onclick={() => openVideo(video)}
                tvNavId={`ghost-results:${video.videoId}`}
              />
            {/each}

            {#if searchStore.canLoadMoreGhost}
              <button
                type="button"
                class="hero-reset-button row-load-more-button"
                onclick={loadMoreResults}
                data-tv-nav-id="ghost-results:load-more"
              >
                {$LL.search.loadMoreResults()}
              </button>
            {/if}
          </TVRow>
        {:else if section.id === 'recent'}
          <TVRow title={$LL.tvHome.continueWatching()} subtitle={$LL.tvHome.continueWatchingSubtitle()}>
            {#each searchStore.recentVideos as video, index (video.videoId)}
              <TVVideoCard
                {video}
                priority={index < 4}
                onclick={() => openVideo(video)}
                tvNavId={`recent:${video.videoId}`}
              />
            {/each}
          </TVRow>
        {:else if section.id === 'favorites'}
          <TVRow
            title={$LL.search.favorites()}
            subtitle={$LL.tvHome.favoritesSubtitle()}
          >
            {#each favoriteVideos as video, index (video.videoId)}
              <TVVideoCard
                {video}
                priority={index < 2}
                onclick={() => openVideo(video)}
                tvNavId={`favorites:${video.videoId}`}
              />
            {/each}
          </TVRow>
        {/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .tv-home-view {
    width: min(100%, 1800px);
    margin: 0 auto;
    padding: 0 0 3rem;
    display: flex;
    flex-direction: column;
    gap: 1.9rem;
  }

  .tv-sections {
    display: flex;
    flex-direction: column;
    gap: 1.9rem;
  }

  .tv-section {
    min-width: 0;
    scroll-margin-top: 88px;
  }

  .tv-section.search-secondary {
    opacity: 0.76;
    transform: scale(0.992);
    transform-origin: top center;
  }

  .tv-home-view :global([data-tv-active='true']) {
    outline: none;
  }

  .hero-search-surface :global(input[data-tv-active='true']),
  .hero-search-surface :global(button[data-tv-active='true']),
  .hero-copy :global(button[data-tv-active='true']) {
    outline: var(--tv-focus-ring, 3px solid rgba(var(--primary-color-rgb), 0.95));
    outline-offset: 3px;
    box-shadow: var(--tv-focus-shadow, 0 0 0 6px rgba(var(--primary-color-rgb), 0.2));
  }

  .hero-search-surface :global(input[data-tv-active='true']) {
    border-color: rgba(var(--primary-color-rgb), 0.85);
  }

  .tv-hero {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.72fr);
    gap: 1rem;
    align-items: start;
  }

  .hero-copy,
  .hero-song-of-day {
    border-radius: 26px;
    border: 1px solid color-mix(in srgb, var(--border-color) 70%, white 10%);
    background:
      radial-gradient(circle at top, rgba(var(--primary-color-rgb), 0.12), transparent 45%),
      color-mix(in srgb, var(--card-background) 94%, black 6%);
    box-shadow: 0 18px 32px rgba(0, 0, 0, 0.14);
  }

  .hero-copy {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 0.9rem 1rem;
  }

  .hero-brand {
    display: inline-flex;
    align-self: start;
    transform-origin: left center;
    transform: scale(0.42);
    margin: 0;
  }

  .hero-brand :global(.lyria-logo) {
    font-size: 72px;
    padding-bottom: 14px;
  }

  .hero-intro {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .hero-kicker {
    display: inline-flex;
    align-self: start;
    padding: 0.3rem 0.55rem;
    border-radius: 999px;
    background: rgba(var(--primary-color-rgb), 0.12);
    color: var(--primary-color);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .hero-intro p {
    margin: 0;
    max-width: 40ch;
    font-size: 0.82rem;
    line-height: 1.28;
    color: color-mix(in srgb, var(--text-color) 75%, transparent);
  }

  .hero-search-surface {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.55rem;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(var(--primary-color-rgb), 0.1);
  }

  .search-status-banner {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    min-width: 0;
    padding: 0.55rem 0.7rem;
    border-radius: 14px;
    border: 1px solid rgba(var(--primary-color-rgb), 0.16);
    background: rgba(var(--primary-color-rgb), 0.08);
    color: color-mix(in srgb, var(--text-color) 88%, transparent);
  }

  .search-status-banner.is-busy {
    background: rgba(var(--primary-color-rgb), 0.12);
    border-color: rgba(var(--primary-color-rgb), 0.24);
  }

  .search-status-banner strong {
    font-size: 0.88rem;
    font-weight: 800;
    color: var(--text-color);
    white-space: nowrap;
  }

  .search-status-banner span {
    min-width: 0;
    font-size: 0.78rem;
    line-height: 1.35;
    color: color-mix(in srgb, var(--text-color) 72%, transparent);
  }

  .hero-reset-button {
    align-self: start;
    border: 1px solid rgba(var(--primary-color-rgb), 0.25);
    background: rgba(var(--primary-color-rgb), 0.08);
    color: var(--text-color);
    border-radius: 999px;
    padding: 0.55rem 0.9rem;
    font-size: 0.8rem;
    font-weight: 700;
    cursor: pointer;
  }

  .hero-song-of-day {
    display: flex;
    flex-direction: column;
    align-self: start;
    padding: 0.85rem;
    gap: 0.7rem;
  }

  .hero-song-copy {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .hero-song-card-shell {
    display: flex;
  }

  .hero-song-copy h2 {
    margin: 0;
    font-size: 1.2rem;
    font-weight: 800;
    line-height: 1.15;
  }

  .hero-song-copy p {
    margin: 0;
    font-size: 0.9rem;
    color: color-mix(in srgb, var(--text-color) 72%, transparent);
    line-height: 1.4;
  }

  .empty-row-card {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.65rem;
    min-height: 180px;
    padding: 1.4rem;
    border-radius: 24px;
    border: 1px dashed rgba(var(--primary-color-rgb), 0.28);
    background: rgba(var(--primary-color-rgb), 0.05);
    color: color-mix(in srgb, var(--text-color) 80%, transparent);
  }

  .loading-row-card {
    background: rgba(var(--primary-color-rgb), 0.08);
    border-style: solid;
  }

  :global(.empty-row-card[data-tv-active='true']) {
    outline: var(--tv-focus-ring, 3px solid rgba(var(--primary-color-rgb), 0.95));
    outline-offset: 4px;
    box-shadow: var(--tv-focus-shadow, 0 0 0 6px rgba(var(--primary-color-rgb), 0.2));
  }

  .empty-row-card strong,
  .empty-row-card span {
    max-width: 24ch;
  }

  .tv-home-view :global(.song-of-day-card),
  .tv-home-view :global(.skeleton-card) {
    max-width: 100%;
    min-width: 100%;
    width: 100%;
  }

  .hero-reset-button:hover {
    transform: translateY(-1px);
  }

  :global(.hero-reset-button[data-tv-active='true']),
  .hero-song-of-day :global(.song-of-day-card[data-tv-active='true']) {
    transform: var(--tv-focus-lift, translateY(-1px) scale(1.01));
  }

  .row-load-more-button {
    min-height: 120px;
    align-self: stretch;
    justify-content: center;
    padding-inline: 1.25rem;
    background: rgba(var(--primary-color-rgb), 0.12);
    border-color: rgba(var(--primary-color-rgb), 0.28);
  }

  .hero-reset-button:focus-visible {
    outline: var(--tv-focus-ring, 3px solid rgba(var(--primary-color-rgb), 0.95));
    outline-offset: 3px;
    box-shadow: var(--tv-focus-shadow, 0 0 0 6px rgba(var(--primary-color-rgb), 0.2));
  }

  @media (max-width: 1200px) {
    .tv-hero {
      grid-template-columns: 1fr;
    }

    .hero-song-of-day {
      max-width: 640px;
    }
  }

  @media (max-width: 768px) {
    .tv-home-view {
      gap: 1.6rem;
      padding-bottom: 2rem;
    }

    .tv-sections {
      gap: 1.6rem;
    }

    .hero-copy,
    .hero-song-of-day {
      border-radius: 24px;
    }

    .hero-copy,
    .hero-song-of-day {
      padding: 1rem;
    }

    .hero-brand {
      transform: scale(0.36);
    }

    .hero-brand :global(.lyria-logo) {
      font-size: 64px;
      padding-bottom: 10px;
    }
  }
</style>
