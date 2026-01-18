<script lang="ts">
  import { onMount } from 'svelte';
  import CaretUp from 'phosphor-svelte/lib/CaretUp';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import FloatingActionButton from '$lib/features/ui/components/FloatingActionButton.svelte';

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

<FloatingActionButton
  IconComponent={CaretUp}
  visible={isVisible}
  onClick={scrollToTop}
  ariaLabel="Scroll to top"
  bottom="20px"
  right="20px"
  iconSize={32}
/>
