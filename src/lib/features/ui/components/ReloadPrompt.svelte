<script lang="ts">
  import X from 'phosphor-svelte/lib/X';
  import ArrowClockwise from 'phosphor-svelte/lib/ArrowClockwise';
  import { fly } from 'svelte/transition';
  import LL from '$i18n/i18n-svelte';

  import { onMount } from 'svelte';

  // This component handles the PWA update logic.
  // It uses the virtual module from vite-plugin-pwa to check for service worker updates.
  // When a new version is deployed (detected by hash changes), $needRefresh becomes true.

  // Conditionally import and use registerSW only if PWA is enabled
  let offlineReady = $state({ subscribe: () => () => {}, set: () => {} } as any);
  let needRefresh = $state({ subscribe: () => () => {}, set: () => {} } as any);
  let updateServiceWorker = $state((_reloadPage?: boolean) => {});

  let isStandalone = $state(false);

  onMount(() => {
    // Async PWA registration (only in production)
    if (import.meta.env.DEV === false) {
      import('virtual:pwa-register/svelte')
        .then(({ useRegisterSW }) => {
          const swRegistration = useRegisterSW({
            onRegistered(swr: any) {
              console.log('SW registered: ', swr);
            },
            onRegisterError(error: any) {
              console.log('SW registration error', error);
            }
          });
          offlineReady = swRegistration.offlineReady;
          needRefresh = swRegistration.needRefresh;
          updateServiceWorker = swRegistration.updateServiceWorker;
        })
        .catch(() => {
          console.log('PWA not available');
        });
    }

    // Check if running in standalone mode (installed PWA)
    // We check for 'standalone', 'fullscreen', and 'minimal-ui' to cover various PWA modes
    const checkStandalone = () => {
      return (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches
      );
    };

    isStandalone = checkStandalone();

    // Optional: Listen for changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => {
      isStandalone = checkStandalone();
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  });

  function close() {
    offlineReady.set(false);
    needRefresh.set(false);
  }
</script>

{#if $needRefresh && isStandalone}
  <div class="pwa-toast" role="alert" transition:fly={{ y: 20, duration: 300 }}>
    <div class="message">
      <ArrowClockwise size={24} weight="fill" color="var(--secondary-color)" />
      <span>{$LL.pwa.newVersionAvailable()}</span>
    </div>
    <div class="buttons">
      <button class="reload-btn" onclick={() => updateServiceWorker(true)}>
        {$LL.pwa.reload()}
      </button>
      <button class="close-btn" onclick={close} aria-label={$LL.pwa.close()}>
        <X size={20} />
      </button>
    </div>
  </div>
{/if}

<style>
  .pwa-toast {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem;
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 0.75rem;
    box-shadow: 0 10px 30px var(--shadow-color);
    color: var(--text-color);
    font-family: 'Inter', sans-serif;
    min-width: 280px;
    max-width: 350px;
  }

  .message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 500;
    font-size: 0.95rem;
  }

  .buttons {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: flex-end;
    margin-top: 0.25rem;
  }

  button {
    cursor: pointer;
    border: none;
    border-radius: 0.5rem;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .reload-btn {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    box-shadow: 0 2px 5px var(--button-shadow-color);
  }

  .reload-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px var(--button-shadow-color);
  }

  .reload-btn:active {
    transform: translateY(0);
  }

  .close-btn {
    background-color: transparent;
    color: var(--text-color);
    opacity: 0.6;
    padding: 0.5rem;
  }

  .close-btn:hover {
    background-color: var(--border-color);
    opacity: 1;
  }
</style>
