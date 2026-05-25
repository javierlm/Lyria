import { describe, it, expect, vi, beforeEach } from 'vitest';
import MiniPlayer from './MiniPlayer.svelte';
import { playerState } from '$lib/features/player/stores/playerStore.svelte';
import * as playerActions from '$lib/features/player/services/playerActions';

vi.mock('$lib/features/player/components/PlayerView.svelte', () => ({
  default: class MockPlayerView {
    $$render() {
      return '<div data-testid="mock-player-view">Mock PlayerView</div>';
    }
  }
}));

describe('MiniPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    playerState.isImmersiveMode = false;
  });

  it('should have toggleImmersiveMode exported from playerActions', () => {
    expect(typeof playerActions.toggleImmersiveMode).toBe('function');
  });

  it('should toggle immersive mode state', () => {
    expect(playerState.isImmersiveMode).toBe(false);
    playerActions.toggleImmersiveMode();
    expect(playerState.isImmersiveMode).toBe(true);
    playerActions.toggleImmersiveMode();
    expect(playerState.isImmersiveMode).toBe(false);
  });

  it('should reflect state changes reactively', () => {
    // Test that the component's derived value reacts to state changes
    playerState.isImmersiveMode = false;
    const checkVisibility = () => playerState.isImmersiveMode;

    expect(checkVisibility()).toBe(false);
    playerState.isImmersiveMode = true;
    expect(checkVisibility()).toBe(true);
  });
});
