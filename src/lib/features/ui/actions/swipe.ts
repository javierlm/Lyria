export function swipe(
  node: HTMLElement,
  {
    onSwipe,
    onSwipeEnd
  }: { onSwipe: (event: CustomEvent<{ dx: number }>) => void; onSwipeEnd: () => void }
) {
  let startX: number;
  let startY: number;
  let currentX: number;
  let isHorizontalSwipe = false;

  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length !== 1) return;

    startX = currentX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
    isHorizontalSwipe = false;
  }

  function handleTouchMove(event: TouchEvent) {
    if (event.touches.length !== 1) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = touch.clientY - startY;

    // Determine swipe direction on first significant movement
    if (!isHorizontalSwipe && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
      isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    }

    // If horizontal swipe, prevent default and dispatch event
    if (isHorizontalSwipe) {
      event.preventDefault(); // Prevents vertical scroll

      const incrementalDx = touch.clientX - currentX;
      currentX = touch.clientX;

      onSwipe(
        new CustomEvent('swipe', {
          detail: { dx: incrementalDx }
        })
      );
    }
  }

  function handleTouchEnd() {
    onSwipeEnd();
    isHorizontalSwipe = false;
  }

  node.addEventListener('touchstart', handleTouchStart, { passive: true });
  node.addEventListener('touchmove', handleTouchMove, { passive: false });
  node.addEventListener('touchend', handleTouchEnd, { passive: true });

  return {
    destroy() {
      node.removeEventListener('touchstart', handleTouchStart);
      node.removeEventListener('touchmove', handleTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
    }
  };
}
