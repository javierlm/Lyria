import { browser } from '$app/environment';

export type TvModePreference = 'auto' | 'enabled' | 'disabled';

const STORAGE_KEY = 'lyria-tv-mode-preference';

const TV_USER_AGENT_TOKENS = [
  'tizen',
  'web0s',
  'webos',
  'smart-tv',
  'smarttv',
  'googletv',
  'google tv',
  'android tv',
  'hbbtv'
];

function detectTvEnvironment(): boolean {
  if (!browser) return false;

  const userAgent = navigator.userAgent.toLowerCase();
  const matchesTvUserAgent = TV_USER_AGENT_TOKENS.some((token) => userAgent.includes(token));

  if (matchesTvUserAgent) {
    return true;
  }

  const largestSide = Math.max(window.innerWidth, window.innerHeight);
  const smallestSide = Math.min(window.innerWidth, window.innerHeight);
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  const noHover = window.matchMedia('(hover: none)').matches;
  const touchPoints = navigator.maxTouchPoints || 0;
  const largeLeanBackViewport = largestSide >= 1280 && smallestSide >= 720;
  const looksLikeTablet = touchPoints > 1 && smallestSide < 900;

  return largeLeanBackViewport && (coarsePointer || noHover) && !looksLikeTablet;
}

function createTvModeStore() {
  let preference = $state<TvModePreference>('auto');
  let autoDetected = $state(false);

  const enabled = () => preference === 'enabled' || (preference === 'auto' && autoDetected);

  function applyDocumentState() {
    if (!browser) return;

    const isEnabled = enabled();
    document.documentElement.classList.toggle('tv-mode', isEnabled);
    document.body.classList.toggle('tv-mode', isEnabled);
  }

  function persistPreference() {
    if (!browser) return;

    try {
      localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Best effort persistence only
    }
  }

  function syncAutoDetected() {
    autoDetected = detectTvEnvironment();
    applyDocumentState();
  }

  function setPreference(nextPreference: TvModePreference) {
    preference = nextPreference;
    persistPreference();
    applyDocumentState();
  }

  function setEnabled(nextEnabled: boolean) {
    setPreference(nextEnabled ? 'enabled' : 'disabled');
  }

  function resetToAuto() {
    preference = 'auto';
    persistPreference();
    syncAutoDetected();
  }

  function init() {
    if (!browser) return;

    try {
      const storedPreference = localStorage.getItem(STORAGE_KEY) as TvModePreference | null;
      if (storedPreference && ['auto', 'enabled', 'disabled'].includes(storedPreference)) {
        preference = storedPreference;
      }
    } catch {
      // Ignore storage read failures
    }

    syncAutoDetected();

    const coarsePointerQuery = window.matchMedia('(pointer: coarse)');
    const hoverQuery = window.matchMedia('(hover: none)');

    const handleViewportChange = () => {
      syncAutoDetected();
    };

    coarsePointerQuery.addEventListener('change', handleViewportChange);
    hoverQuery.addEventListener('change', handleViewportChange);
    window.addEventListener('resize', handleViewportChange);

    return () => {
      coarsePointerQuery.removeEventListener('change', handleViewportChange);
      hoverQuery.removeEventListener('change', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
    };
  }

  if (browser) {
    init();
  }

  return {
    get autoDetected() {
      return autoDetected;
    },
    get enabled() {
      return enabled();
    },
    get preference() {
      return preference;
    },
    setEnabled,
    setPreference,
    resetToAuto
  };
}

export const tvModeStore = createTvModeStore();
