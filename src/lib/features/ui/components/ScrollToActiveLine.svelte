<script lang="ts">
  import Target from 'phosphor-svelte/lib/Target';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import FloatingActionButton from '$lib/features/ui/components/FloatingActionButton.svelte';

  const { lyricRowRefs = [] } = $props<{ lyricRowRefs: (HTMLDivElement | null)[] }>();

  function scrollToActiveLine() {
    if (playerState.currentLineIndex >= 0 && lyricRowRefs[playerState.currentLineIndex]) {
      const activeRow = lyricRowRefs[playerState.currentLineIndex];
      if (activeRow) {
        activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
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
