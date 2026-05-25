export interface ScrollRecoveryHandle {
  frameId: number | undefined;
  retryTimeout: ReturnType<typeof setTimeout> | undefined;
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
