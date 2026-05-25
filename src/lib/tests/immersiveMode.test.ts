import { beforeEach, describe, expect, it } from 'vitest';

import { playerState } from '$lib/features/player/stores/playerStore.svelte';
import { resetPlayerState, toggleImmersiveMode } from '$lib/features/player/services/playerActions';

describe('immersive mode state', () => {
  beforeEach(() => {
    playerState.isImmersiveMode = false;
  });

  it('should have isImmersiveMode set to false by default', () => {
    expect(playerState.isImmersiveMode).toBe(false);
  });

  it('should toggle isImmersiveMode to true', () => {
    toggleImmersiveMode();
    expect(playerState.isImmersiveMode).toBe(true);
  });

  it('should toggle isImmersiveMode back to false', () => {
    playerState.isImmersiveMode = true;
    toggleImmersiveMode();
    expect(playerState.isImmersiveMode).toBe(false);
  });
});

describe('resetPlayerState clears immersive mode', () => {
  it('should reset isImmersiveMode to false', () => {
    playerState.isImmersiveMode = true;
    resetPlayerState();
    expect(playerState.isImmersiveMode).toBe(false);
  });
});
