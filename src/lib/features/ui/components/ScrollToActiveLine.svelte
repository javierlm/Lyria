<script lang="ts">
  import Target from 'phosphor-svelte/lib/Target';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import FloatingActionButton from '$lib/features/ui/components/FloatingActionButton.svelte';

  const { lyricRowRefs = [], targetLineIndex = -1 } = $props<{
    lyricRowRefs: (HTMLDivElement | null)[];
    targetLineIndex?: number;
  }>();

  function scrollToActiveLine() {
    if (targetLineIndex < 0 || !lyricRowRefs[targetLineIndex]) {
      return;
    }

    const activeRow = lyricRowRefs[targetLineIndex];
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
</script>

<FloatingActionButton
  IconComponent={Target}
  visible={playerState.lyricsAreSynced && !playerState.forceHorizontalMode}
  onClick={scrollToActiveLine}
  ariaLabel="Scroll to active line"
  bottom="80px"
  right="20px"
  iconSize={32}
/>
