<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let { isPlayerView = false } = $props();

	let logo: HTMLDivElement;
	let container: HTMLDivElement;
	let isAnimated = $state(false);
	let isPulsing = $state(false);

	// Event handlers
	const handleLogoClick = (event: MouseEvent) => {
		event.preventDefault();
		if (isPlayerView) {
			isPulsing = true;
			setTimeout(() => {
				isPulsing = false;
			}, 300);
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('/');
	};

	onMount(() => {
		const createdStyles: HTMLStyleElement[] = [];

		// Trigger animation after a short delay to ensure initial render is complete
		const animationTimeout = setTimeout(() => {
			isAnimated = true;
		}, 100); // Adjust delay as needed

		// Cleanup on component destruction
		return () => {
			createdStyles.forEach((style) => style.remove());
			clearTimeout(animationTimeout); // Clear timeout on destroy
		};
	});
</script>

<a href="/" onclick={handleLogoClick} class="logo-anchor">
	<div class="container" bind:this={container}>
		<div
			class="lyria-logo"
			class:animated={isAnimated}
			class:player-view-hover={isPlayerView}
			class:pulsing={isPulsing}
			id="logo"
			bind:this={logo}
		>
			<span class="letter primary" data-char="L">L</span>
			<span class="letter primary" data-char="y">y</span>
			<span class="letter secondary" data-char="r">r</span>
			<span class="letter secondary" data-char="i">i</span>
			<span class="letter secondary" data-char="a">a</span>
			<div class="underline">
				<div class="underline-circle"></div>
			</div>
		</div>
	</div>
</a>

<style>
	.logo-anchor {
		text-decoration: none;
		display: inline-block;
		position: relative;
	}

	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	.container {
		position: relative;
	}

	.lyria-logo {
		font-family: 'Inter', sans-serif;
		font-size: 96px;
		font-weight: 800;
		letter-spacing: -3px;
		display: inline-block;
		position: relative;
		user-select: none;
		cursor: pointer;
		text-shadow: 4px 4px 8px var(--darker-shadow-color);
		opacity: 0;
		transition:
			opacity 0.4s ease-in-out,
			transform 0.2s ease-in-out,
			filter 0.2s ease-in-out;
		padding-bottom: 25px;
	}

	.lyria-logo.animated {
		opacity: 1;
	}

	.lyria-logo.player-view-hover:hover {
		transform: scale(1.05);
		filter: brightness(1.2);
	}

	.lyria-logo.pulsing {
		animation: pulse 0.3s ease-in-out;
	}

	@keyframes pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.1);
		}
		100% {
			transform: scale(1);
		}
	}

	.letter {
		display: inline-block;
		position: relative;
		transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
	}

	.letter.primary {
		color: var(--primary-color);
	}

	.letter.secondary {
		color: var(--text-color);
	}

	/* Animación de carga */
	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animated .letter {
		animation: fadeInUp 0.6s ease-out backwards;
	}

	.animated .letter:nth-child(1) {
		animation-delay: 0.1s;
	}
	.animated .letter:nth-child(2) {
		animation-delay: 0.2s;
	}
	.animated .letter:nth-child(3) {
		animation-delay: 0.3s;
	}
	.animated .letter:nth-child(4) {
		animation-delay: 0.4s;
	}
	.animated .letter:nth-child(5) {
		animation-delay: 0.5s;
	}

	@keyframes underline-appear {
		from {
			width: 0;
		}
		to {
			width: 100%;
		}
	}

	/* Línea decorativa inferior */
	.underline {
		position: absolute;
		bottom: 0;
		left: 0;
		height: 5px;
		background: linear-gradient(90deg, var(--text-color) 5%, var(--primary-color) 50%);
		width: 100%;
		animation: underline-appear 0.8s 0.5s cubic-bezier(0.4, 0, 0.2, 1) backwards;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
	}

	.underline-circle {
		position: absolute;
		right: 0;
		bottom: -5px;
		width: 15px;
		height: 15px;
		background-color: var(--primary-color);
		border-radius: 50%;
		transform: translateX(50%);
		box-shadow: 0 0 10px var(--shadow-color);
	}
</style>
