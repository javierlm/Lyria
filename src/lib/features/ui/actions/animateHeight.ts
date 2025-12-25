/**
 * Svelte action that smoothly animates height changes of an element.
 * Call the returned update method to trigger animation.
 */
export function animateHeight(
  node: HTMLElement,
  options: { duration?: number; onUpdate?: (update: () => void) => void } = {}
) {
  const duration = options.duration ?? 300;
  let isTransitioning = false;
  let currentHeight = 0;

  node.style.transition = `height ${duration}ms ease-in-out`;

  function update() {
    if (isTransitioning) return;

    requestAnimationFrame(() => {
      const newHeight = node.scrollHeight;

      if (newHeight !== currentHeight && currentHeight > 0) {
        isTransitioning = true;
        const originalOverflow = node.style.overflow;

        node.style.overflow = 'hidden';
        node.style.height = `${currentHeight}px`;
        node.offsetHeight;
        node.style.height = `${newHeight}px`;

        const transitionEnd = () => {
          node.style.height = '';
          node.style.overflow = originalOverflow;
          isTransitioning = false;
          node.removeEventListener('transitionend', transitionEnd);
        };

        node.addEventListener('transitionend', transitionEnd);
      }

      currentHeight = newHeight;
    });
  }

  // Initialize current height
  requestAnimationFrame(() => {
    currentHeight = node.scrollHeight;
  });

  // Pass update function to parent if callback provided
  if (options.onUpdate) {
    options.onUpdate(update);
  }

  return {
    destroy() {
      node.style.transition = '';
      node.style.height = '';
    }
  };
}
