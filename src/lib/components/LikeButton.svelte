<script lang="ts">
	import IconHeart from 'phosphor-svelte/lib/Heart';

	type Props = {
		isLiked?: boolean;
		onclick?: () => void;
		size?: number;
	};

	let { isLiked = false, onclick, size = 24 }: Props = $props();
	let isAnimating = $state(false);

	const handleClick = () => {
		onclick?.();
		isAnimating = true;
		setTimeout(() => {
			isAnimating = false;
		}, 800);
	};
</script>

<button
	onclick={handleClick}
	class="like-button"
	class:liked={isLiked}
	class:animating={isAnimating}
	style={isLiked
		? 'background: linear-gradient(to right, var(--primary-color), var(--secondary-color)); color: var(--on-primary-color); box-shadow: 0 10px 15px -3px rgba(var(--primary-color-rgb), 0.3);'
		: ''}
>
	<div
		class="heart-icon-wrapper"
		class:filled={isLiked}
		class:ping={isAnimating && isLiked}
		class:shrink={isAnimating && !isLiked}
	>
		<IconHeart {size} weight={isLiked ? 'fill' : 'regular'} color="currentColor" />
	</div>
	<span class="button-text" class:text-shadow={isLiked}>Me gusta</span>

	{#if isAnimating && isLiked}
		<div class="pulse-ring"></div>
		<div class="particle particle-1"></div>
		<div class="particle particle-2"></div>
		<div class="particle particle-3"></div>
	{/if}
</button>

<style>
	.like-button {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		font-weight: 600;
		font-size: 0.75rem;
		transition: all 0.3s ease;
		cursor: pointer;
		border: 1px solid var(--border-color);
		background: var(--card-background);
		color: var(--text-color);
	}

	.like-button:not(.liked):hover {
		background: rgba(var(--primary-color-rgb), 0.1);
		color: var(--primary-color);
		border-color: var(--primary-color);
		transform: scale(1.05);
	}

	.like-button.animating {
		transform: scale(0.95);
	}

	.like-button:not(.animating):hover {
		transform: scale(1.05);
	}

	/* Heart icon */
	.heart-icon-wrapper {
		transition: all 0.5s ease-out;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.heart-icon-wrapper.filled {
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
	}

	.heart-icon-wrapper.ping {
		animation: ping-once 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.heart-icon-wrapper.shrink {
		animation: shrink 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	/* Text shadow */
	.text-shadow {
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
	}

	/* Pulse ring */
	.pulse-ring {
		position: absolute;
		inset: 0;
		border-radius: 9999px;
		background: radial-gradient(circle, rgba(239, 68, 68, 0.5) 0%, transparent 70%);
		animation: pulse-ring 0.6s ease-out forwards;
		pointer-events: none;
	}

	/* Particles */
	.particle {
		position: absolute;
		border-radius: 50%;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		pointer-events: none;
	}

	.particle-1 {
		top: -0.25rem;
		right: -0.25rem;
		width: 1rem;
		height: 1rem;
		background: #fbbf24;
		animation: float-1 0.6s ease-out forwards;
	}

	.particle-2 {
		top: -0.5rem;
		left: 1rem;
		width: 0.75rem;
		height: 0.75rem;
		background: #fb923c;
		animation: float-2 0.7s ease-out forwards;
	}

	.particle-3 {
		bottom: -0.25rem;
		left: -0.25rem;
		width: 0.75rem;
		height: 0.75rem;
		background: #fbbf24;
		animation: float-3 0.65s ease-out forwards;
	}

	/* Animations */
	@keyframes ping-once {
		0% {
			transform: scale(1);
			opacity: 1;
		}
		40% {
			transform: scale(1.25);
			opacity: 0.9;
		}
		60% {
			transform: scale(0.95);
			opacity: 1;
		}
		80% {
			transform: scale(1.05);
			opacity: 1;
		}
		100% {
			transform: scale(1);
			opacity: 1;
		}
	}

	@keyframes shrink {
		0% {
			transform: scale(1);
		}
		40% {
			transform: scale(0.75);
		}
		70% {
			transform: scale(1.05);
		}
		100% {
			transform: scale(1);
		}
	}

	@keyframes pulse-ring {
		0% {
			transform: scale(1);
			opacity: 0.6;
		}
		100% {
			transform: scale(1.8);
			opacity: 0;
		}
	}

	@keyframes float-1 {
		0% {
			transform: translate(0, 0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(12px, -20px) scale(0);
			opacity: 0;
		}
	}

	@keyframes float-2 {
		0% {
			transform: translate(0, 0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(-10px, -22px) scale(0);
			opacity: 0;
		}
	}

	@keyframes float-3 {
		0% {
			transform: translate(0, 0) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(-14px, 12px) scale(0);
			opacity: 0;
		}
	}

	@media (max-width: 768px) {
		.button-text {
			display: none;
		}

		.like-button {
			padding: 0.5rem;
			gap: 0;
		}
	}
</style>
