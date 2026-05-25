export type TvRemoteAction =
  | 'playPause'
  | 'play'
  | 'pause'
  | 'seekBackward'
  | 'seekForward'
  | 'openInfo';

const KEY_TO_ACTION = new Map<string, TvRemoteAction>([
  ['MediaPlayPause', 'playPause'],
  ['MediaPlay', 'play'],
  ['MediaPause', 'pause'],
  ['MediaRewind', 'seekBackward'],
  ['MediaFastForward', 'seekForward'],
  ['Info', 'openInfo']
]);

const KEYCODE_TO_ACTION = new Map<number, TvRemoteAction>([
  [10252, 'playPause'],
  [415, 'play'],
  [19, 'pause'],
  [412, 'seekBackward'],
  [417, 'seekForward'],
  [457, 'openInfo']
]);

export function getTvRemoteAction(event: KeyboardEvent): TvRemoteAction | null {
  if (KEY_TO_ACTION.has(event.key)) {
    return KEY_TO_ACTION.get(event.key) ?? null;
  }

  return KEYCODE_TO_ACTION.get(event.keyCode) ?? null;
}
