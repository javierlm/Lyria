<script lang="ts">
  import { onMount } from 'svelte';
  import type { SongOfTheDayDisplay } from '../domain/SongOfTheDay';
  import type { Snippet } from 'svelte';
  import LL from '$i18n/i18n-svelte';
  import { goto } from '$app/navigation';
  import { songOfTheDayStore } from '../stores/songOfTheDayStore.svelte';

  interface Props {
    skeleton?: Snippet;
  }

  let { skeleton }: Props = $props();

  let song = $state<SongOfTheDayDisplay | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      const res = await fetch('/api/song-of-the-day');
      if (res.ok) {
        song = await res.json();
      }
    } catch (error) {
      console.error('Error loading song of the day:', error);
    } finally {
      loading = false;
    }
  });

  /**
   * Handles click on the song card.
   * Saves official artist/track to store before navigation.
   * This ensures the player uses correct metadata for lyrics search.
   */
  function handleClick(event: MouseEvent): void {
    if (!song) return;

    event.preventDefault();
    songOfTheDayStore.saveOfficialData(song);
    goto(`/play?id=${song.videoId}`);
  }
</script>

{#if loading}
  {@render skeleton?.()}
{:else if song}
  <a href="/play?id={song.videoId}" class="song-of-day-card" onclick={handleClick}>
    <div class="thumbnail">
      <img src="https://img.youtube.com/vi/{song.videoId}/mqdefault.jpg" alt={song.track} />
    </div>
    <div class="info">
      <span class="label">{$LL.songOfTheDay.label({ year: song.year })}</span>
      <h3 class="title">{song.track}</h3>
      <p class="artist">{song.artist}</p>
    </div>
  </a>
{/if}

<style>
  .song-of-day-card {
    display: flex;
    gap: 12px;
    padding: 12px;
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    color: var(--text-color);
    text-decoration: none;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
    box-shadow: 0 2px 8px var(--shadow-color);
    max-width: 400px;
    min-width: 280px;
  }

  .song-of-day-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px var(--darker-shadow-color);
    border-color: var(--primary-color);
  }

  .thumbnail {
    position: relative;
    flex-shrink: 0;
  }

  .thumbnail img {
    width: 120px;
    height: auto;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    object-fit: cover;
    border: 2px solid var(--border-color);
    transition: border-color 0.2s ease;
    display: block;
  }

  .song-of-day-card:hover .thumbnail img {
    border-color: var(--primary-color);
  }

  .info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .label {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--primary-color);
    margin-bottom: 4px;
    line-height: 1.2;
    white-space: nowrap;
  }

  .title {
    font-size: 15px;
    font-weight: 600;
    margin: 0;
    line-height: 1.3;
    color: var(--text-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }

  .artist {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-color);
    opacity: 0.7;
    margin: 4px 0 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 200px;
  }

  @media (max-width: 768px) {
    .song-of-day-card {
      max-width: 320px;
      padding: 10px;
      gap: 10px;
      align-items: center;
    }

    .thumbnail img {
      width: 80px;
      height: 45px;
      aspect-ratio: 16 / 9;
    }

    .info {
      justify-content: center;
    }

    .label {
      font-size: 9px;
      margin-bottom: 2px;
    }

    .title {
      font-size: 12px;
      max-width: 110px;
      line-height: 1.2;
    }

    .artist {
      font-size: 10px;
      max-width: 110px;
      margin: 2px 0 0 0;
    }
  }

  /* Very small mobile screens - less than 360px */
  @media (max-width: 360px) {
    .song-of-day-card {
      max-width: 100%;
      padding: 6px;
      gap: 6px;
    }

    .thumbnail img {
      width: 60px;
      height: 34px;
    }

    .label {
      font-size: 8px;
      margin-bottom: 1px;
    }

    .title {
      font-size: 10px;
      max-width: 90px;
      line-height: 1.1;
    }

    .artist {
      font-size: 8px;
      max-width: 90px;
      margin: 1px 0 0 0;
    }
  }
</style>
