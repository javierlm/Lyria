<script lang="ts">
  import { onMount } from 'svelte';
  import Logo from '$lib/features/ui/components/Logo.svelte';
  import SearchBar from '$lib/features/search/components/SearchBar.svelte';
  import SongOfTheDayCard from '$lib/features/song-of-the-day/components/SongOfTheDayCard.svelte';
  import SongOfTheDaySkeleton from '$lib/features/song-of-the-day/components/SongOfTheDaySkeleton.svelte';

  let isKeyboardOpen = $state(false);
  let inputHasFocus = $state(false);
  let maxViewportHeight = $state(0);
  const MIN_VIEWPORT_HEIGHT = 600;

  function detectKeyboard() {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const windowHeight = window.innerHeight;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (viewportHeight > maxViewportHeight) {
      maxViewportHeight = viewportHeight;
    }

    const referenceHeight = Math.max(maxViewportHeight, windowHeight, MIN_VIEWPORT_HEIGHT);
    const heightDifference = referenceHeight - viewportHeight;
    const viewportSignificantlyReduced = heightDifference > 30;
    const viewportNearFull = heightDifference < 20;

    let keyboardOpen;
    if (viewportNearFull) {
      keyboardOpen = false;
    } else if (viewportSignificantlyReduced) {
      keyboardOpen = true;
    } else {
      keyboardOpen = inputHasFocus && isTouchDevice;
    }

    if (keyboardOpen !== isKeyboardOpen) {
      isKeyboardOpen = keyboardOpen;
    }
  }

  onMount(() => {
    const originalHtmlHeight = document.documentElement.style.height;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

    // Initialize max viewport height with minimum safe value
    // This prevents issues in Firefox where visualViewport may be incorrect on initial load
    const initialViewportHeight = window.visualViewport?.height || window.innerHeight;
    maxViewportHeight = Math.max(initialViewportHeight, MIN_VIEWPORT_HEIGHT);

    // Detect if running in PWA standalone mode and add class to body for CSS targeting
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      (navigator as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      document.body.classList.add('pwa-standalone');
    } else {
      document.body.classList.add('browser-mode');
    }

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const dropdown =
        e.target instanceof Element ? e.target.closest('.recent-videos-dropdown') : null;

      if (dropdown) {
        const el = dropdown as HTMLElement;
        const touchY = e.touches[0].clientY;
        const deltaY = touchY - touchStartY;

        const isAtTop = el.scrollTop === 0;
        const isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 1;

        if (isAtTop && deltaY > 0) {
          if (e.cancelable) e.preventDefault();
          return;
        }

        if (isAtBottom && deltaY < 0) {
          if (e.cancelable) e.preventDefault();
          return;
        }
        return;
      }

      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' && target?.getAttribute('type') === 'text') {
        inputHasFocus = true;
        detectKeyboard();
      }
    };

    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' && target?.getAttribute('type') === 'text') {
        inputHasFocus = false;
        detectKeyboard();
      }
    };

    const handleViewportResize = () => {
      detectKeyboard();
    };

    // Set up all listeners
    window.visualViewport?.addEventListener('resize', handleViewportResize);
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Initial detection
    detectKeyboard();

    return () => {
      window.visualViewport?.removeEventListener('resize', handleViewportResize);
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);

      document.documentElement.style.removeProperty('height');
      document.documentElement.style.removeProperty('max-height');
      document.documentElement.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('position');

      document.body.style.removeProperty('height');
      document.body.style.removeProperty('max-height');
      document.body.style.removeProperty('overflow');
      document.body.classList.remove('pwa-standalone', 'browser-mode');

      const wrapper = document.querySelector('.home-page-wrapper') as HTMLElement;
      if (wrapper) {
        wrapper.style.removeProperty('height');
        wrapper.style.removeProperty('max-height');
        wrapper.style.removeProperty('overflow');
      }

      if (originalHtmlHeight) document.documentElement.style.height = originalHtmlHeight;
      if (originalBodyHeight) document.body.style.height = originalBodyHeight;
      if (originalHtmlOverflow) document.documentElement.style.overflow = originalHtmlOverflow;
      if (originalBodyOverflow) document.body.style.overflow = originalBodyOverflow;
    };
  });
</script>

<div class="search-screen" class:keyboard-open={isKeyboardOpen}>
  <div class="center-block">
    <div class="logo-container">
      <Logo />
    </div>

    <!-- Desktop: Positioned absolutely to the right -->
    <!-- Mobile: Positioned in normal flow between logo and search -->
    <div class="song-of-day-wrapper" class:hidden={isKeyboardOpen}>
      <SongOfTheDayCard>
        {#snippet skeleton()}
          <SongOfTheDaySkeleton />
        {/snippet}
      </SongOfTheDayCard>
    </div>

    <div class="search-wrapper">
      <SearchBar centered={true} />
    </div>
  </div>
</div>

<style>
  .search-screen {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
    position: relative;
    box-sizing: border-box;
    padding-bottom: 20%;
    overscroll-behavior-y: none;
    -webkit-overflow-scrolling: touch;
  }

  .center-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    width: 100%;
    max-width: 800px;
    padding: 0 1rem;
    box-sizing: border-box;
    position: relative; /* For absolute positioning context */
  }

  .logo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    transform: scale(0.9);
    z-index: 1;
    margin-bottom: 0.5rem;
  }

  .search-screen.keyboard-open .logo-container {
    margin-bottom: 0 !important;
  }

  .search-wrapper {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
  }

  .search-screen.keyboard-open .search-wrapper {
    margin-top: -0.5rem;
  }

  /* Desktop: Position absolutely to the right */
  .song-of-day-wrapper {
    display: flex;
    position: absolute;
    top: 81%;
    right: -380px;
    transform: translateY(-50%);
    z-index: 10;
  }

  .song-of-day-wrapper.hidden {
    display: none;
  }

  /* Mobile: Position in normal flow */
  @media (max-width: 1650px) {
    .search-screen {
      justify-content: flex-start;
      padding-top: 2.5rem;
      padding-bottom: 1rem;
    }

    .search-screen.keyboard-open {
      height: auto;
      min-height: 0;
      padding-top: 0.25rem;
      padding-bottom: 0.5rem;
    }

    .center-block {
      max-width: 95%;
      padding: 0 0.5rem;
    }

    .search-screen.keyboard-open .center-block {
      gap: 0;
    }

    /* Mobile: Reset positioning */
    .song-of-day-wrapper {
      position: relative;
      top: auto;
      right: auto;
      transform: none;
      justify-content: center;
      width: 100%;
      margin-top: 0;
      margin-bottom: 1rem;
      min-height: 90px;
      transition:
        min-height 0.3s ease,
        opacity 0.3s ease;
      contain: layout;
      transform: translateZ(0);
      will-change: transform;
    }

    .song-of-day-wrapper.hidden {
      min-height: 0;
      opacity: 0;
      margin-top: 0;
      margin-bottom: 0;
    }

    .logo-container {
      transform: scale(0.6);
      margin-top: 0;
      margin-bottom: 0.5rem;
    }

    .search-screen.keyboard-open .logo-container {
      transform: scale(0.35);
      margin-top: -1rem;
      margin-bottom: 0;
    }
  }

  @media (max-width: 600px) {
    .logo-container {
      transform: scale(0.5);
      margin-bottom: 0.5rem;
    }

    .search-screen.keyboard-open .logo-container {
      transform: scale(0.3);
      margin-top: -1rem;
      margin-bottom: 0;
    }

    .song-of-day-wrapper {
      margin-bottom: 1rem;
    }
  }

  @media (max-width: 400px) {
    .song-of-day-wrapper {
      min-height: 70px;
    }
  }
</style>
