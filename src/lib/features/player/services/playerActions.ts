import {
  getSyncedLyrics,
  type LyricsResult,
  getLyricById,
  searchCandidates,
  type LRCLibResponse
} from '$lib/features/player/services/lrclib';
import { videoService } from '$lib/features/video/services/videoService';
import { getLanguage, setLanguage } from '$lib/features/settings/domain/language';
import {
  getPlayer,
  setPlayer,
  playerState,
  LyricsStates
} from '$lib/features/player/stores/playerStore.svelte';
import {
  parseTitle,
  removeJunkSuffixes,
  getPrimaryLanguage,
  isLyricVideoTitle,
  isValidYouTubeId
} from '$lib/shared/utils';
import { frontendTranslationService } from '$lib/features/settings/services/FrontendTranslationService';
import { replaceState } from '$app/navigation';

let animationFrameId: number | null = null;
let lastSyncedTime = 0;
let lastSyncTimestamp = 0;
let lastPeriodicSync = 0;
let isPlayerPlaying = false;

const HUMAN_REACTION_TIME_MS = 500;
const PORCENTAGE_LANGUAGE_THRESHOLD = 80;
const PERIODIC_SYNC_INTERVAL_MS = 5000;
const VIDEO_LOAD_TIMEOUT_MS = 15000;

let videoLoadTimeoutId: ReturnType<typeof setTimeout> | null = null;
let currentSearchId = 0;
let currentVideoLoadId = 0;

function loadYouTubeAPI() {
  return new Promise<void>((resolve) => {
    if (window.YT && window.YT.Player) {
      return resolve();
    }
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    window.onYouTubeIframeAPIReady = () => resolve();
    tag.tabIndex = -1;
    document.body.appendChild(tag);
  });
}

export async function translateLyrics(targetLang: string) {
  if (playerState.lines.length === 0) return;

  const lyricsText = playerState.lines.map((line) => line.text);
  const timestamps = playerState.lines.map((line) => line.startTimeMs);
  try {
    const translationResponse = await frontendTranslationService.translate(
      lyricsText,
      targetLang,
      'auto',
      {
        id: playerState.id,
        artist: playerState.artist,
        track: playerState.track
      }
    );

    if (!translationResponse) {
      console.error('Translation process returned null.');
      return;
    }

    const {
      translatedText,
      detectedSourceLanguage,
      percentageOfDetectedLanguages,
      isSameLanguage
    } = translationResponse;

    if (!translatedText || !Array.isArray(translatedText)) {
      throw new Error('Invalid translatedText received from server.');
    }

    if (timestamps.length === translatedText.length) {
      playerState.translatedLines = timestamps.map((timestamp, index) => ({
        startTimeMs: timestamp,
        text: translatedText[index]
      }));
      playerState.isTranslatedTextReady = true;
      playerState.detectedSourceLanguage = detectedSourceLanguage;
      playerState.percentageOfDetectedLanguages = percentageOfDetectedLanguages;

      // Use backend's isSameLanguage flag if available, otherwise use old logic
      if (isSameLanguage !== undefined) {
        playerState.showTranslatedSubtitle = !isSameLanguage;
      } else {
        updateTranslatedSubtitleVisibility(
          targetLang,
          detectedSourceLanguage,
          percentageOfDetectedLanguages
        );
      }
    } else {
      console.warn('Mismatch in line count between original and translated lyrics');
    }
  } catch (error) {
    console.error('Translation failed:', error);
  }
}

function updateTranslatedSubtitleVisibility(
  targetLang: string,
  detectedSourceLanguage: string | undefined,
  percentageOfDetectedLanguages: number | undefined
) {
  const isSameLanguage =
    detectedSourceLanguage &&
    getPrimaryLanguage(detectedSourceLanguage) === getPrimaryLanguage(targetLang);

  if (
    detectedSourceLanguage &&
    (percentageOfDetectedLanguages ?? 0) >= PORCENTAGE_LANGUAGE_THRESHOLD &&
    isSameLanguage
  ) {
    playerState.showTranslatedSubtitle = false;
  } else {
    playerState.showTranslatedSubtitle = true;
  }
}

export function handleLanguageChange(newLanguage: string) {
  const upperCaseLanguage = newLanguage.toUpperCase();
  playerState.userLang = upperCaseLanguage;
  setLanguage(upperCaseLanguage);
  console.log('ID LRCLib: ', playerState.id);
  translateLyrics(upperCaseLanguage);
}

function syncWithIframe() {
  const player = getPlayer();
  if (!player) return;

  try {
    lastSyncedTime = player.getCurrentTime();
    lastSyncTimestamp = performance.now();
    playerState.currentTime = lastSyncedTime;
  } catch (error) {
    console.error('Error syncing with iframe:', error);
  }
}

function updateFrame() {
  const player = getPlayer();
  if (!player || playerState.isSeeking) {
    animationFrameId = null;
    return;
  }

  const now = performance.now();

  if (isPlayerPlaying) {
    const elapsedSeconds = (now - lastSyncTimestamp) / 1000;
    playerState.currentTime = lastSyncedTime + elapsedSeconds;

    if (now - lastPeriodicSync >= PERIODIC_SYNC_INTERVAL_MS) {
      syncWithIframe();
      lastPeriodicSync = now;
    }
  }

  if (playerState.lyricsAreSynced && playerState.lines.length > 0) {
    const t = playerState.currentTime * 1000;
    const adjustedTime = t - playerState.timingOffset;

    let needsUpdate = false;
    let newIndex = playerState.currentLineIndex;

    if (newIndex < playerState.lines.length - 1) {
      const nextLine = playerState.lines[newIndex + 1];
      if (adjustedTime >= nextLine.startTimeMs) {
        needsUpdate = true;
        for (let i = newIndex + 1; i < playerState.lines.length; i++) {
          if (adjustedTime >= playerState.lines[i].startTimeMs) {
            newIndex = i;
          } else {
            break;
          }
        }
      }
    }

    if (!needsUpdate && newIndex >= 0) {
      const currentLine = playerState.lines[newIndex];
      if (adjustedTime < currentLine.startTimeMs) {
        needsUpdate = true;
        const oldIndex = newIndex;
        newIndex = -1;
        for (let i = oldIndex - 1; i >= 0; i--) {
          if (adjustedTime >= playerState.lines[i].startTimeMs) {
            newIndex = i;
            break;
          }
        }
      }
    }

    if (!needsUpdate && newIndex === -1 && adjustedTime >= 0) {
      if (playerState.lines.length > 0 && adjustedTime >= playerState.lines[0].startTimeMs) {
        needsUpdate = true;
        for (let i = 0; i < playerState.lines.length; i++) {
          if (adjustedTime >= playerState.lines[i].startTimeMs) {
            newIndex = i;
          } else {
            break;
          }
        }
      }
    }

    if (needsUpdate && newIndex !== playerState.currentLineIndex) {
      playerState.currentLineIndex = newIndex;
      playerState.currentLine = newIndex !== -1 ? playerState.lines[newIndex].text : '';
      playerState.currentTranslatedLine =
        newIndex !== -1 ? playerState.translatedLines[newIndex]?.text || '' : '';
    }
  } else {
    playerState.currentLineIndex = -1;
    playerState.currentLine = '';
    playerState.currentTranslatedLine = '';
  }

  if (isPlayerPlaying && !playerState.isSeeking) {
    animationFrameId = requestAnimationFrame(updateFrame);
  } else {
    animationFrameId = null;
  }
}

function startSync() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  syncWithIframe();
  lastPeriodicSync = performance.now();
  isPlayerPlaying = true;
  animationFrameId = requestAnimationFrame(updateFrame);
}

function stopSync() {
  isPlayerPlaying = false;
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function handlePlayerError(event: YT.OnErrorEvent) {
  const errorCode = event.data;
  let message: string;

  // YouTube IFrame API error codes:
  // 2 - Invalid video ID parameter
  // 5 - HTML5 player error
  // 100 - Video not found or removed
  // 101/150 - Video not playable (embedding disabled by owner)
  switch (errorCode) {
    case 2:
      message = 'invalidId';
      break;
    case 100:
      message = 'notFound';
      break;
    case 101:
    case 150:
      message = 'notPlayable';
      break;
    case 5:
    default:
      message = 'genericError';
      break;
  }

  playerState.videoError = { code: errorCode, message };
  playerState.isLoadingVideo = false;
  clearVideoLoadTimeout();
  console.error(`YouTube Player Error: Code ${errorCode} - ${message}`);
}

function clearVideoLoadTimeout() {
  if (videoLoadTimeoutId) {
    clearTimeout(videoLoadTimeoutId);
    videoLoadTimeoutId = null;
  }
}

function startVideoLoadTimeout() {
  clearVideoLoadTimeout();
  videoLoadTimeoutId = setTimeout(() => {
    if (playerState.isLoadingVideo && !playerState.videoError) {
      playerState.videoError = { code: -1, message: 'genericError' };
      playerState.isLoadingVideo = false;
      console.error('Video load timeout: Video failed to load within the expected time.');
    }
  }, VIDEO_LOAD_TIMEOUT_MS);
}

function destroyExistingPlayer() {
  const oldPlayer = getPlayer();
  if (oldPlayer) {
    oldPlayer.destroy();
    setPlayer(null);
    console.log('Destroyed old player.');
  }
}

function resetPlayerState() {
  playerState.artist = '';
  playerState.track = '';
  playerState.lines = [];
  playerState.translatedLines = [];
  playerState.currentLine = '';
  playerState.currentTranslatedLine = '';
  playerState.currentLineIndex = -1;
  playerState.isTranslatedTextReady = false;
  playerState.lyricsAreSynced = false;
  playerState.lyricsState = LyricsStates.Idle;
  playerState.duration = 0;
  playerState.currentTime = 0;
  playerState.isPlaying = false;
  playerState.detectedSourceLanguage = undefined;
  playerState.percentageOfDetectedLanguages = undefined;
  playerState.showTranslatedSubtitle = true;
  playerState.manualLyricId = null;
  playerState.searchQuery = '';
  playerState.candidates = [];
  playerState.isLyricSelectorOpen = false;
  playerState.isLyricVideo = false;
  playerState.videoError = null;
  playerState.parsedTitle = null;
}

export async function loadVideo(videoId: string, elementId: string, initialOffset?: number) {
  destroyExistingPlayer();
  resetPlayerState();
  clearVideoLoadTimeout();

  const loadId = ++currentVideoLoadId;
  playerState.videoId = videoId;
  playerState.isLoadingVideo = true;
  if (initialOffset) {
    playerState.timingOffset = initialOffset;
  }

  if (!videoId || !isValidYouTubeId(videoId)) {
    playerState.videoError = { code: 2, message: 'invalidId' };
    playerState.isLoadingVideo = false;
    console.error(`Invalid YouTube video ID format: "${videoId}"`);
    return;
  }

  await loadYouTubeAPI();
  if (loadId !== currentVideoLoadId) return;

  await loadAndApplyVideoDelay(videoId);
  if (loadId !== currentVideoLoadId) return;

  new YT.Player(elementId, {
    videoId,
    playerVars: {
      playsinline: 1,
      fs: 0,
      rel: 0,
      modestbranding: 1,
      controls: 0,
      disablekb: 1,
      showinfo: 0,
      origin: window.location.origin
    },
    events: {
      onReady: (event) => handlePlayerReady(event, videoId, loadId),
      onError: (event) => handlePlayerError(event),
      onStateChange: (event) => {
        const prevIsPlaying = playerState.isPlaying;
        playerState.isPlaying = event.data === YT.PlayerState.PLAYING;

        if (event.data === YT.PlayerState.BUFFERING) {
          playerState.isSeeking = true;
          stopSync();
        } else if (
          event.data === YT.PlayerState.PLAYING ||
          event.data === YT.PlayerState.PAUSED ||
          event.data === YT.PlayerState.ENDED
        ) {
          playerState.isSeeking = false;

          if (event.data === YT.PlayerState.PLAYING) {
            playerState.isLoadingVideo = false;
            clearVideoLoadTimeout();
            if (!prevIsPlaying) {
              startSync();
            }
          } else if (event.data === YT.PlayerState.PAUSED) {
            stopSync();
            syncWithIframe();
          } else if (event.data === YT.PlayerState.ENDED) {
            stopSync();
            playerState.currentTime = playerState.duration;
          }
        }
      }
    }
  });

  // Start timeout to handle cases where YouTube doesn't fire onError
  startVideoLoadTimeout();
}

async function loadAndApplyVideoDelay(videoId: string) {
  const currentVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const storedDelay = await videoService.getVideoDelay(currentVideoUrl);
  if (storedDelay !== undefined) {
    playerState.timingOffset = storedDelay;
  }

  // Load stored lyric ID
  if (!playerState.manualLyricId) {
    const storedLyricId = await videoService.getVideoLyricId(currentVideoUrl);
    if (storedLyricId !== null) {
      playerState.manualLyricId = storedLyricId;
      const url = new URL(window.location.href);
      url.searchParams.set('lyricId', storedLyricId.toString());
      replaceState(url, {});
    }
  }
}

async function fetchAndProcessLyrics(player: YT.Player, loadId?: number) {
  playerState.lyricsState = LyricsStates.Loading;
  const videoData = player.getVideoData();
  const duration = player.getDuration();

  if (loadId !== undefined && loadId !== currentVideoLoadId) return;

  if (playerState.manualLyricId) {
    console.log('Fetching manual lyric ID:', playerState.manualLyricId);
    try {
      const result = await getLyricById(playerState.manualLyricId);
      if (loadId !== undefined && loadId !== currentVideoLoadId) return;
      updatePlayerState(result, videoData);
      if (result.found) {
        await translateLyrics(getLanguage());
      }
      return;
    } catch (e) {
      console.error('Failed to load manual lyric, falling back to auto search', e);
    }
  }

  const result = await searchLyricsWithStrategies(videoData, duration);
  if (loadId !== undefined && loadId !== currentVideoLoadId) return;
  updatePlayerState(result, videoData);

  if (result.found) {
    await translateLyrics(getLanguage());
  }
}

async function searchLyricsWithStrategies(
  videoData: YT.VideoData,
  duration: number
): Promise<LyricsResult> {
  const strategies = [tryCleanedTitle, tryParsedTitle, tryInvertedParameters];
  let collectedCandidates: LRCLibResponse[] = [];

  for (const strategy of strategies) {
    // Cache parsed title if not already present
    if (!playerState.parsedTitle) {
      playerState.parsedTitle = parseTitle(videoData.title);
    }
    const result = await strategy(videoData, duration);

    if (result.candidates) {
      const existingIds = new Set(collectedCandidates.map((c) => c.id));
      const newCandidates = result.candidates.filter((c) => !existingIds.has(c.id));
      collectedCandidates = [...collectedCandidates, ...newCandidates];
    }

    if (result.found) {
      result.candidates = collectedCandidates;
      return result;
    }
  }

  return { found: false, synced: false, lyrics: [], candidates: collectedCandidates };
}

async function tryCleanedTitle(videoData: YT.VideoData, duration: number): Promise<LyricsResult> {
  const cleanedTitle = removeJunkSuffixes(videoData.title);
  console.log(`Attempting lyric search with cleaned raw title: "${cleanedTitle}"`);

  return await getSyncedLyrics(cleanedTitle, '', duration);
}

async function tryParsedTitle(videoData: YT.VideoData, duration: number): Promise<LyricsResult> {
  console.log('Cleaned raw title search failed. Proceeding with full parsing logic.');

  const parsedTitle = playerState.parsedTitle || parseTitle(videoData.title);
  const artist = parsedTitle.artist || videoData.author;
  const track = parsedTitle.track;

  if (!parsedTitle.artist) {
    console.log(`Parsed artist was empty, using YouTube channel name: "${artist}"`);
  }

  return await getSyncedLyrics(track, artist, duration);
}

async function tryInvertedParameters(
  videoData: YT.VideoData,
  duration: number
): Promise<LyricsResult> {
  const parsedTitle = playerState.parsedTitle || parseTitle(videoData.title);
  const artist = parsedTitle.artist || videoData.author;
  const track = parsedTitle.track;

  console.log(`No lyrics found for "${track}" by "${artist}". Retrying with inverted parameters.`);

  const result = await getSyncedLyrics(artist, track, duration);

  if (result.found) {
    console.log('Successfully found lyrics with inverted parameters.');
  }

  return result;
}

function updatePlayerState(result: LyricsResult, videoData: YT.VideoData) {
  // Detect lyric video and set initial visibility
  const isLyricVideo = isLyricVideoTitle(videoData.title);
  playerState.isLyricVideo = isLyricVideo;
  if (isLyricVideo) {
    playerState.showOriginalSubtitle = false;
  }

  // Update artist and track
  if (result.found && result.artistName && result.trackName) {
    playerState.artist = result.artistName;
    playerState.track = result.trackName;
  } else {
    // If we have cached parsed title, use it, otherwise parse it (should rely on cache mostly)
    const parsedTitle = playerState.parsedTitle || parseTitle(videoData.title);
    playerState.artist = parsedTitle.artist || videoData.author;
    playerState.track = parsedTitle.track;
  }

  // Update lyrics state
  playerState.lyricsState = result.found ? LyricsStates.Found : LyricsStates.NotFound;
  playerState.lyricsAreSynced = result.synced;
  playerState.lines = result.lyrics;
  playerState.id = result.id || 0;
  playerState.userLang = getLanguage();
  if (result.candidates) {
    playerState.candidates = result.candidates;
  }

  // Attempt to detect language immediately if found
  if (result.found && result.lyrics.length > 0) {
    frontendTranslationService
      .detectSourceLanguage(result.lyrics.map((l) => l.text))
      .then((lang) => {
        if (lang) {
          playerState.detectedSourceLanguage = lang;
        }
      });
  }
}

function initializePlayerProperties(player: YT.Player) {
  playerState.duration = player.getDuration();
  player.setVolume(playerState.volume);
  playerState.isMuted = player.isMuted();
}

async function addCurrentVideoToRecents(videoId: string) {
  if (videoId && playerState.artist && playerState.track) {
    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    await videoService.addRecentVideo({
      videoId,
      artist: playerState.artist,
      track: playerState.track,
      timestamp: Date.now(),
      thumbnailUrl
    });
  }
}

async function handlePlayerReady(event: YT.PlayerEvent, videoId: string, loadId: number) {
  if (loadId !== currentVideoLoadId) return;

  const player = event.target;
  setPlayer(player);

  // Clear the timeout since the player loaded successfully
  clearVideoLoadTimeout();

  // Prevent YouTube iframe from receiving keyboard focus
  const iframe = player.getIframe();
  if (iframe) {
    iframe.setAttribute('tabindex', '-1');
  }

  await fetchAndProcessLyrics(player, loadId);
  if (loadId !== currentVideoLoadId) return;

  initializePlayerProperties(player);

  startSync();
  player.playVideo();

  await addCurrentVideoToRecents(videoId);
}

export function play() {
  getPlayer()?.playVideo();
}

export function pause() {
  getPlayer()?.pauseVideo();
}

export function seekTo(time: number) {
  const player = getPlayer();
  if (player) {
    playerState.isSeeking = true;
    player.seekTo(time, true);

    lastSyncedTime = time;
    lastSyncTimestamp = performance.now();
    playerState.currentTime = time;

    if (playerState.lyricsAreSynced && playerState.lines.length > 0) {
      const t = time * 1000;
      const adjustedTime = t - playerState.timingOffset;
      const activeIndex = playerState.lines.findLastIndex((l) => adjustedTime >= l.startTimeMs);

      if (activeIndex !== playerState.currentLineIndex) {
        playerState.currentLineIndex = activeIndex;
        playerState.currentLine = activeIndex !== -1 ? playerState.lines[activeIndex].text : '';
        playerState.currentTranslatedLine =
          activeIndex !== -1 ? playerState.translatedLines[activeIndex]?.text || '' : '';
      }
    }
  }
}

export function setVolume(volume: number) {
  const player = getPlayer();
  if (player) {
    player.setVolume(volume);
    playerState.volume = volume;
    if (typeof window !== 'undefined') {
      localStorage.setItem('lyria_volume', volume.toString());
    }
  }
}

export function mute() {
  const player = getPlayer();
  if (player) {
    player.mute();
    playerState.isMuted = true;
  }
}

export function unMute() {
  const player = getPlayer();
  if (player) {
    player.unMute();
    playerState.isMuted = false;
  }
}

export function adjustTiming(offset: number) {
  let finalOffset = offset;

  if (playerState.lines.length > 0 && playerState.duration > 0) {
    const firstLineWithText = playerState.lines.find((l) => l.text.trim().length > 0);
    const lastLineWithText = playerState.lines.findLast((l) => l.text.trim().length > 0);

    if (firstLineWithText && lastLineWithText) {
      const firstLineTime = firstLineWithText.startTimeMs;
      const videoDurationMs = playerState.duration * 1000;

      const minOffset = -firstLineTime;
      const maxOffset = Math.abs(videoDurationMs - lastLineWithText.startTimeMs);

      if (minOffset <= maxOffset) {
        finalOffset = Math.max(minOffset, Math.min(offset, maxOffset));
      }
    }
  }

  playerState.timingOffset = finalOffset;

  if (playerState.videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${playerState.videoId}`;
    videoService.setVideoDelay(videoUrl, finalOffset);
  }
}

export function toggleFullscreen(element: HTMLElement | null) {
  if (!element) return;

  const isNativeFullscreen =
    document.fullscreenElement ||
    (document as any).webkitFullscreenElement ||
    (document as any).mozFullScreenElement ||
    (document as any).msFullscreenElement;

  if (isNativeFullscreen) {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  } else if (playerState.isFullscreen) {
    playerState.isFullscreen = false;
  } else {
    if (element.requestFullscreen) {
      element.requestFullscreen().catch((err) => {
        console.warn(`Native fullscreen failed: ${err.message}, falling back to CSS`);
        playerState.isFullscreen = true;
      });
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    } else {
      playerState.isFullscreen = true;
    }
  }
}

export function syncTimingToFirstLine() {
  if (!playerState.lyricsAreSynced) return;
  const player = getPlayer();
  if (!player) return;

  const currentTime = player.getCurrentTime() * 1000;
  const firstLine = playerState.lines.find((l) => l.text.trim().length > 0);
  if (firstLine) {
    const newTimingOffset = currentTime - firstLine.startTimeMs - HUMAN_REACTION_TIME_MS;
    const roundedTimingOffset = Math.round(newTimingOffset);
    adjustTiming(roundedTimingOffset);
  }
}

export async function selectLyric(id: number) {
  playerState.manualLyricId = id;
  // Update URL
  const url = new URL(window.location.href);
  url.searchParams.set('lyricId', id.toString());
  replaceState(url, {});

  // Persist the lyric ID selection
  if (playerState.videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${playerState.videoId}`;
    videoService.setVideoLyricId(videoUrl, id);
  }

  // Load new lyric
  playerState.lyricsState = LyricsStates.Loading;
  playerState.lines = [];
  playerState.translatedLines = [];
  playerState.isTranslatedTextReady = false;

  try {
    const result = await getLyricById(id);
    if (playerState.candidates.length > 0 && !result.candidates) {
      result.candidates = playerState.candidates;
    }

    const player = getPlayer();
    const videoData = player?.getVideoData() || { title: '', author: '', video_id: '' };
    updatePlayerState(result, videoData);

    if (result.found) {
      await translateLyrics(getLanguage());
    }
  } catch (error) {
    console.error('Error selecting lyric:', error);
    playerState.lyricsState = LyricsStates.NotFound;
  }
}

export async function clearManualLyric() {
  playerState.manualLyricId = null;
  // Update URL
  const url = new URL(window.location.href);
  url.searchParams.delete('lyricId');
  replaceState(url, {});

  // Clear the persisted lyric ID selection
  if (playerState.videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${playerState.videoId}`;
    videoService.setVideoLyricId(videoUrl, null);
  }

  // Reload auto lyrics
  const player = getPlayer();
  if (player) {
    await fetchAndProcessLyrics(player);
  }
}

export async function ensureCandidatesLoaded() {
  if (playerState.candidates.length > 0) return;
  await loadDefaultCandidates(++currentSearchId);
}

async function loadDefaultCandidates(searchId: number) {
  const player = getPlayer();
  if (!player) return;

  const videoData = player.getVideoData();
  const duration = player.getDuration();

  const cleanTitle = removeJunkSuffixes(videoData.title);

  let candidates = await searchCandidates(cleanTitle, '', duration);
  if (searchId !== currentSearchId) return;

  if (candidates.length === 0) {
    const parsedTitle = playerState.parsedTitle || parseTitle(videoData.title);
    const artist = parsedTitle.artist || videoData.author;
    const track = parsedTitle.track;
    candidates = await searchCandidates(track, artist, duration);
    if (searchId !== currentSearchId) return;
  }

  playerState.candidates = candidates;
}

export async function performSearch(query: string) {
  const searchId = ++currentSearchId;

  if (!query.trim()) {
    playerState.candidates = [];
    return;
  }

  const player = getPlayer();
  if (!player) return;

  const duration = player.getDuration();
  const candidates = await searchCandidates(query, '', duration);

  if (searchId !== currentSearchId) return;

  playerState.candidates = candidates;
}
