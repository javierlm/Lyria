import { browser } from '$app/environment';
import { videoService, setUseDemoRepository } from '$lib/features/video/services/videoService';
import demoVideos from '$lib/features/video/data/demoVideos';

const STORAGE_KEY = 'demo-mode';
const DEMO_DB_NAME = 'LyriaDemoDB';

function createDemoStore() {
  let isDemoMode = $state(false);
  let isDemoInitialized = $state(false);
  let initializationPromise: Promise<void> | null = null;

  function init() {
    if (!browser) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    isDemoMode = stored === 'true';
    // If it was already active, it's considered initialized because the videos must be in the DB
    if (isDemoMode) {
      isDemoInitialized = true;
    }
    setUseDemoRepository(isDemoMode);
    console.log('[demoStore] init - isDemoMode:', isDemoMode, 'isInitialized:', isDemoInitialized);
  }

  async function activateDemoMode(): Promise<void> {
    console.log('[demoStore] activateDemoMode called');
    if (isDemoMode && isDemoInitialized) return;

    isDemoMode = true;
    setUseDemoRepository(true);
    if (browser) {
      localStorage.setItem(STORAGE_KEY, 'true');
    }

    if (!isDemoInitialized) {
      if (initializationPromise) return initializationPromise;

      initializationPromise = initializeDemoVideos().then(() => {
        isDemoInitialized = true;
        initializationPromise = null;
        console.log('[demoStore] Demo videos initialized');
      });
      return initializationPromise;
    }
  }

  async function initializeDemoVideos(): Promise<void> {
    console.log('[demoStore] Starting to add', demoVideos.length, 'demo videos');
    for (let i = 0; i < demoVideos.length; i++) {
      const video = demoVideos[i];
      await videoService.addRecentVideo(video);
    }
    console.log('[demoStore] All demo videos added');
  }

  async function waitForInitialization(): Promise<void> {
    if (!isDemoMode || isDemoInitialized) {
      return Promise.resolve();
    }
    return initializationPromise ?? Promise.resolve();
  }

  async function deactivateDemoMode() {
    console.log('[demoStore] deactivateDemoMode called');
    isDemoMode = false;
    setUseDemoRepository(false);
    isDemoInitialized = false;
    initializationPromise = null;

    if (browser) {
      localStorage.removeItem(STORAGE_KEY);

      // Close repository connections before deleting DB
      videoService.close();
      await clearDemoDatabase();

      // Force a reload to clear all states and show real videos
      window.location.reload();
    }
  }

  async function clearDemoDatabase() {
    console.log('[demoStore] Clearing demo database:', DEMO_DB_NAME);
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DEMO_DB_NAME);
      request.onsuccess = () => {
        console.log('[demoStore] Demo database deleted successfully');
        resolve();
      };
      // request.onblocked is important when deleting DB
      request.onblocked = () => {
        console.warn('[demoStore] Deletion blocked. Still open connections?');
        resolve(); // We continue anyway
      };
      request.onerror = () => {
        console.error('[demoStore] Error deleting demo database');
        reject(request.error);
      };
    });
  }

  if (browser) {
    init();
  }

  return {
    get isDemoMode() {
      return isDemoMode;
    },
    get isInitialized() {
      return isDemoInitialized;
    },
    activateDemoMode,
    waitForInitialization,
    deactivateDemoMode,
    clearDemoDatabase
  };
}

export const demoStore = createDemoStore();
