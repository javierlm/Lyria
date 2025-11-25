<script lang="ts">
	import { onMount } from 'svelte';
	import { CaretUp } from 'phosphor-svelte';
	import { playerState } from '$lib/stores/playerStore.svelte';

	let showButton = $state(false);
	let isVisible = $derived(showButton && !playerState.isFullscreen);

	function scrollToTop() {
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	}

	onMount(() => {
		const sentinel = document.querySelector('#scroll-sentinel');
		if (!sentinel) {
			console.error('Scroll sentinel not found for BackToTop button.');
			return;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				showButton = !entry.isIntersecting;
			},
			{
				root: null,
				threshold: 0
			}
		);

		observer.observe(sentinel);

		return () => {
			observer.unobserve(sentinel);
		};
	});
</script>

{#if isVisible}
	<button class="back-to-top show" onclick={scrollToTop}>
		<CaretUp size={32} />
	</button>
{/if}

<style>
	.back-to-top {
		position: fixed;
		bottom: 20px;
		right: 20px;
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		color: var(--on-primary-color);
		border: none;
		border-radius: 50%;
		width: 48px;
		height: 48px;
		font-size: 24px;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		opacity: 0;
		transition:
			opacity 0.3s,
			transform 0.2s ease,
			filter 0.2s ease;
		z-index: 1000;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
	}

	.back-to-top.show {
		opacity: 1;
	}

	.back-to-top:hover {
		transform: scale(1.1);
		filter: brightness(1.1);
		box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
	}

	@media (max-width: 480px) {
		.back-to-top {
			width: 40px;
			height: 40px;
		}
	}
</style>
