// Keyboard state store - shared across components
// This ensures all components see the same keyboard state and react consistently

interface KeyboardState {
  isOpen: boolean;
  isMobile: boolean;
  inputHasFocus: boolean;
  maxViewportHeight: number;
  isPWA: boolean;
}

// Initialize state
export const keyboardStore = $state<KeyboardState>({
  isOpen: false,
  isMobile: false,
  inputHasFocus: false,
  maxViewportHeight: 0,
  isPWA: false
});

const MIN_VIEWPORT_HEIGHT = 600;
const KEYBOARD_THRESHOLD = 100; // pixels
const FIREFOX_KEYBOARD_THRESHOLD = 150; // Firefox needs higher threshold due to bottom bar

// Detect if running in PWA mode
function detectPWA(): boolean {
  if (globalThis.window === undefined) return false;
  return (
    globalThis.matchMedia('(display-mode: standalone)').matches ||
    globalThis.matchMedia('(display-mode: fullscreen)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

// Detect Firefox mobile
function isFirefoxMobile(): boolean {
  if (globalThis.window === undefined) return false;
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('firefox') && (userAgent.includes('android') || userAgent.includes('mobile'))
  );
}

// Main keyboard detection function - unified logic
export function detectKeyboard() {
  if (globalThis.window === undefined) return;

  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  const windowHeight = window.innerHeight;
  const isTouchDevice = 'ontouchstart' in globalThis || navigator.maxTouchPoints > 0;
  const isFirefox = isFirefoxMobile();

  // Update max viewport height
  if (viewportHeight > keyboardStore.maxViewportHeight) {
    keyboardStore.maxViewportHeight = viewportHeight;
  }

  // Desktop (non-touch): always closed
  if (!isTouchDevice) {
    keyboardStore.isOpen = false;
    return;
  }

  // Calculate if keyboard is open
  const referenceHeight = Math.max(
    keyboardStore.maxViewportHeight,
    windowHeight,
    MIN_VIEWPORT_HEIGHT
  );
  const heightDifference = referenceHeight - viewportHeight;

  // Use higher threshold for Firefox due to bottom navigation bar
  const threshold = isFirefox ? FIREFOX_KEYBOARD_THRESHOLD : KEYBOARD_THRESHOLD;

  // Keyboard is open if viewport is significantly reduced and input has focus
  const viewportSignificantlyReduced = heightDifference > threshold;
  const wasOpen = keyboardStore.isOpen;

  if (viewportSignificantlyReduced && keyboardStore.inputHasFocus) {
    keyboardStore.isOpen = true;
  } else if (heightDifference < 50) {
    // Viewport near full - keyboard closed
    keyboardStore.isOpen = false;
  }

  // Log for debugging
  if (wasOpen !== keyboardStore.isOpen) {
    console.log('[KeyboardStore] Keyboard state changed:', {
      isOpen: keyboardStore.isOpen,
      heightDifference,
      threshold,
      isFirefox,
      viewportHeight,
      windowHeight
    });
  }
}

// Initialize the store
export function initKeyboardStore() {
  if (globalThis.window === undefined) return;

  keyboardStore.isMobile = window.innerWidth <= 768;
  keyboardStore.isPWA = detectPWA();
  keyboardStore.maxViewportHeight = Math.max(
    window.visualViewport?.height || window.innerHeight,
    MIN_VIEWPORT_HEIGHT
  );

  // Set up event listeners
  const handleViewportResize = () => {
    detectKeyboard();
  };

  const handleFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === 'INPUT' && target?.getAttribute('type') === 'text') {
      keyboardStore.inputHasFocus = true;
      detectKeyboard();
    }
  };

  const handleFocusOut = (e: FocusEvent) => {
    const target = e.target as HTMLElement;
    if (target?.tagName === 'INPUT' && target?.getAttribute('type') === 'text') {
      keyboardStore.inputHasFocus = false;
      detectKeyboard();
    }
  };

  const handleResize = () => {
    keyboardStore.isMobile = window.innerWidth <= 768;
    detectKeyboard();
  };

  // Add listeners
  window.visualViewport?.addEventListener('resize', handleViewportResize);
  document.addEventListener('focusin', handleFocusIn);
  document.addEventListener('focusout', handleFocusOut);
  window.addEventListener('resize', handleResize);

  // Initial detection
  detectKeyboard();

  // Return cleanup function
  return () => {
    window.visualViewport?.removeEventListener('resize', handleViewportResize);
    document.removeEventListener('focusin', handleFocusIn);
    document.removeEventListener('focusout', handleFocusOut);
    window.removeEventListener('resize', handleResize);
  };
}

// Helper to force keyboard state (useful for PWA or manual control)
export function setKeyboardState(isOpen: boolean) {
  keyboardStore.isOpen = isOpen;
}
