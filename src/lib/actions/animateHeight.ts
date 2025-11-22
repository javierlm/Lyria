/**
 * Svelte action that smoothly animates height changes of an element.
 * Uses MutationObserver to detect DOM changes and CSS transitions for smooth animations.
 */
export function animateHeight(node: HTMLElement, options: { duration?: number } = {}) {
	const duration = options.duration ?? 300;
	let isTransitioning = false;
	let currentHeight = 0;

	node.style.transition = `height ${duration}ms ease-in-out`;

	function updateHeight() {
		if (isTransitioning) return;

		const originalOverflow = node.style.overflow;
		node.style.overflow = 'hidden';
		isTransitioning = true;

		requestAnimationFrame(() => {
			const newHeight = node.scrollHeight;

			if (newHeight !== currentHeight && currentHeight > 0) {
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
			} else {
				node.style.overflow = originalOverflow;
				isTransitioning = false;
			}

			currentHeight = newHeight;
		});
	}

	requestAnimationFrame(() => {
		currentHeight = node.scrollHeight;
	});

	const observer = new MutationObserver(() => {
		updateHeight();
	});

	observer.observe(node, {
		childList: true,
		subtree: true
	});

	return {
		destroy() {
			observer.disconnect();
			node.style.transition = '';
			node.style.height = '';
		}
	};
}
