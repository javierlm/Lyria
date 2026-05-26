export interface ScrollRecoveryHandle {
  frameId: number | undefined;
  retryTimeout: ReturnType<typeof setTimeout> | undefined;
}

export interface ScrollLine {
  text: string;
  startTimeMs: number;
}

export interface InitialTargetInput {
  lines: ScrollLine[];
  currentLineIndex: number;
  currentTimeSeconds: number;
  timingOffsetMs: number;
  lyricsAreSynced: boolean;
}

export function hasVisibleText(lines: ScrollLine[], index: number): boolean {
  return !!lines[index]?.text?.trim();
}

export function findNextVisibleLineIndex(lines: ScrollLine[], startIndex: number): number {
  for (let i = Math.max(0, startIndex); i < lines.length; i += 1) {
    if (hasVisibleText(lines, i)) {
      return i;
    }
  }

  return -1;
}

export function getUpcomingVisibleLineIndex(input: InitialTargetInput): number {
  const { lines, currentLineIndex, currentTimeSeconds, timingOffsetMs, lyricsAreSynced } = input;

  if (!lyricsAreSynced) {
    return -1;
  }

  if (currentLineIndex >= 0) {
    return findNextVisibleLineIndex(lines, currentLineIndex + 1);
  }

  const adjustedTimeMs = currentTimeSeconds * 1000 - timingOffsetMs;

  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].startTimeMs > adjustedTimeMs && hasVisibleText(lines, i)) {
      return i;
    }
  }

  return -1;
}

export function getInitialTargetLineIndex(input: InitialTargetInput): number {
  const { lines, currentLineIndex } = input;

  if (currentLineIndex >= 0 && hasVisibleText(lines, currentLineIndex)) {
    return currentLineIndex;
  }

  const upcomingIndex = getUpcomingVisibleLineIndex(input);
  if (upcomingIndex >= 0) {
    return upcomingIndex;
  }

  return findNextVisibleLineIndex(lines, 0);
}

export function cancelScrollRecovery(handle: ScrollRecoveryHandle): void {
  if (handle.frameId !== undefined) {
    cancelAnimationFrame(handle.frameId);
    handle.frameId = undefined;
  }

  if (handle.retryTimeout) {
    clearTimeout(handle.retryTimeout);
    handle.retryTimeout = undefined;
  }
}

export function scheduleScrollRecovery(
  handle: ScrollRecoveryHandle,
  run: () => void,
  retryMs = 120
): void {
  cancelScrollRecovery(handle);

  handle.frameId = requestAnimationFrame(() => {
    run();
    handle.frameId = undefined;
  });

  handle.retryTimeout = setTimeout(() => {
    run();
    handle.retryTimeout = undefined;
  }, retryMs);
}
