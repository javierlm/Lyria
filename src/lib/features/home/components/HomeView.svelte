<script lang="ts">
  import { onMount } from 'svelte';
  import Logo from '$lib/features/ui/components/Logo.svelte';
  import SearchBar from '$lib/features/search/components/SearchBar.svelte';
  import { searchStore } from '$lib/features/search/stores/searchStore.svelte';

  let isKeyboardOpen = $state(false);

  onMount(() => {
    const originalHtmlHeight = document.documentElement.style.height;
    const originalBodyHeight = document.body.style.height;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;

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

    const detectKeyboard = () => {
      if (window.visualViewport) {
        const visualViewport = window.visualViewport;

        const handleResize = () => {
          const keyboardHeight = window.innerHeight - visualViewport.height;
          const wasOpen = isKeyboardOpen;
          isKeyboardOpen = keyboardHeight > 10;
          searchStore.isKeyboardOpen = isKeyboardOpen;

          if (isKeyboardOpen !== wasOpen) {
            if (isKeyboardOpen) {
              document.addEventListener('touchstart', handleTouchStart, { passive: true });
              document.addEventListener('touchmove', handleTouchMove, { passive: false });
            } else {
              document.removeEventListener('touchstart', handleTouchStart);
              document.removeEventListener('touchmove', handleTouchMove);
            }
          }

          if (isKeyboardOpen) {
            document.documentElement.style.setProperty(
              'height',
              `${visualViewport.height}px`,
              'important'
            );
            document.documentElement.style.setProperty(
              'max-height',
              `${visualViewport.height}px`,
              'important'
            );
            document.documentElement.style.setProperty('overflow', 'hidden', 'important');
            document.documentElement.style.setProperty('position', 'fixed', 'important');

            document.body.style.setProperty('height', `${visualViewport.height}px`, 'important');
            document.body.style.setProperty(
              'max-height',
              `${visualViewport.height}px`,
              'important'
            );
            document.body.style.setProperty('overflow', 'hidden', 'important');

            const wrapper = document.querySelector('.home-page-wrapper') as HTMLElement;
            if (wrapper) {
              wrapper.style.setProperty('height', `${visualViewport.height}px`, 'important');
              wrapper.style.setProperty('max-height', `${visualViewport.height}px`, 'important');
              wrapper.style.setProperty('overflow', 'hidden', 'important');
            }
          } else {
            document.documentElement.style.removeProperty('height');
            document.documentElement.style.removeProperty('max-height');
            document.documentElement.style.removeProperty('overflow');
            document.documentElement.style.removeProperty('position');

            document.body.style.removeProperty('height');
            document.body.style.removeProperty('max-height');
            document.body.style.removeProperty('overflow');

            const wrapper = document.querySelector('.home-page-wrapper') as HTMLElement;
            if (wrapper) {
              wrapper.style.removeProperty('height');
              wrapper.style.removeProperty('max-height');
              wrapper.style.removeProperty('overflow');
            }
          }
        };

        visualViewport.addEventListener('resize', handleResize);

        return () => {
          visualViewport.removeEventListener('resize', handleResize);
          document.removeEventListener('touchstart', handleTouchStart);
          document.removeEventListener('touchmove', handleTouchMove);
        };
      } else {
        let lastInnerHeight = window.innerHeight;

        const handleResize = () => {
          const currentHeight = window.innerHeight;
          const heightDiff = lastInnerHeight - currentHeight;
          const wasOpen = isKeyboardOpen;
          isKeyboardOpen = heightDiff > 10;
          searchStore.isKeyboardOpen = isKeyboardOpen;
          lastInnerHeight = currentHeight;

          if (isKeyboardOpen !== wasOpen) {
            if (isKeyboardOpen) {
              document.addEventListener('touchstart', handleTouchStart, { passive: true });
              document.addEventListener('touchmove', handleTouchMove, { passive: false });
            } else {
              document.removeEventListener('touchstart', handleTouchStart);
              document.removeEventListener('touchmove', handleTouchMove);
            }
          }

          if (isKeyboardOpen) {
            document.documentElement.style.setProperty('height', `${currentHeight}px`, 'important');
            document.documentElement.style.setProperty(
              'max-height',
              `${currentHeight}px`,
              'important'
            );
            document.documentElement.style.setProperty('overflow', 'hidden', 'important');
            document.documentElement.style.setProperty('position', 'fixed', 'important');

            document.body.style.setProperty('height', `${currentHeight}px`, 'important');
            document.body.style.setProperty('max-height', `${currentHeight}px`, 'important');
            document.body.style.setProperty('overflow', 'hidden', 'important');

            const wrapper = document.querySelector('.home-page-wrapper') as HTMLElement;
            if (wrapper) {
              wrapper.style.setProperty('height', `${currentHeight}px`, 'important');
              wrapper.style.setProperty('max-height', `${currentHeight}px`, 'important');
              wrapper.style.setProperty('overflow', 'hidden', 'important');
            }
          } else {
            document.documentElement.style.removeProperty('height');
            document.documentElement.style.removeProperty('max-height');
            document.documentElement.style.removeProperty('overflow');
            document.documentElement.style.removeProperty('position');

            document.body.style.removeProperty('height');
            document.body.style.removeProperty('max-height');
            document.body.style.removeProperty('overflow');

            const wrapper = document.querySelector('.home-page-wrapper') as HTMLElement;
            if (wrapper) {
              wrapper.style.removeProperty('height');
              wrapper.style.removeProperty('max-height');
              wrapper.style.removeProperty('overflow');
            }
          }
        };

        window.addEventListener('resize', handleResize);

        return () => {
          window.removeEventListener('resize', handleResize);
          document.removeEventListener('touchstart', handleTouchStart);
          document.removeEventListener('touchmove', handleTouchMove);
        };
      }
    };

    const cleanup = detectKeyboard();

    return () => {
      if (cleanup) cleanup();
      document.documentElement.style.removeProperty('height');
      document.documentElement.style.removeProperty('max-height');
      document.documentElement.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('position');

      document.body.style.removeProperty('height');
      document.body.style.removeProperty('max-height');
      document.body.style.removeProperty('overflow');

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
    gap: 1.5rem;
    width: 100%;
    max-width: 800px;
    padding: 0 1rem;
    box-sizing: border-box;
  }

  .logo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    transform: scale(0.9);
    z-index: 1;
    margin-bottom: 5%;
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

  @media (max-width: 768px) {
    .search-screen {
      padding-bottom: 75%;
    }

    .search-screen.keyboard-open {
      height: auto;
      min-height: 0;
      padding-bottom: 1rem;
    }

    .center-block {
      max-width: 95%;
      gap: 1rem;
      padding: 0 0.5rem;
    }

    .search-screen.keyboard-open .center-block {
      gap: 0;
    }

    .logo-container {
      transform: scale(0.6);
    }

    .search-screen.keyboard-open .logo-container {
      transform: scale(0.35);
      margin-bottom: 0;
    }
  }

  @media (max-width: 480px) {
    .logo-container {
      transform: scale(0.5);
    }

    .search-screen.keyboard-open .logo-container {
      transform: scale(0.3);
      margin-bottom: 0;
    }

    .center-block {
      gap: 0.75rem;
    }

    .search-screen.keyboard-open .center-block {
      gap: 0;
    }
  }
</style>
