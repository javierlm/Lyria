import { getSyncedLyrics, type LyricsResult } from '$lib/lrclib';
import { videoService } from '$lib/data/videoService';
import { getLanguage, setLanguage } from '$lib/language';
import { getPlayer, setPlayer, playerState, LyricsStates } from '$lib/stores/playerStore.svelte';
import { parseTitle, removeJunkSuffixes, getPrimaryLanguage } from '$lib/utils';
import type { TranslationResponse } from '$lib/TranslationProvider';

let syncInterval: NodeJS.Timeout;
const HUMAN_REACTION_TIME_MS = 500;
const PORCENTAGE_LANGUAGE_THRESHOLD = 80;

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
		const response = await fetch('/api/translate', {
			method: 'POST',
			body: JSON.stringify({
				sourceLanguage: 'auto',
				targetLanguage: targetLang,
				text: lyricsText,
				id: playerState.id,
				artist: playerState.artist,
				track: playerState.track
			}),
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			throw new Error(
				`Server translation failed with status ${response.status}: ${await response.text()}`
			);
		}

		const translationResponse: TranslationResponse = await response.json();

		const { translatedText, detectedSourceLanguage, percentageOfDetectedLanguages } =
			translationResponse;

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

			updateTranslatedSubtitleVisibility(
				targetLang,
				detectedSourceLanguage,
				percentageOfDetectedLanguages
			);
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

function startSync() {
	if (syncInterval) clearInterval(syncInterval);

	syncInterval = setInterval(() => {
		const player = getPlayer();
		if (!player || playerState.isSeeking || player.getPlayerState() === YT.PlayerState.ENDED)
			return;

		playerState.currentTime = player.getCurrentTime();

		if (playerState.lyricsAreSynced && playerState.lines.length > 0) {
			const t = playerState.currentTime * 1000;
			const adjustedTime = t - playerState.timingOffset;
			const activeIndex = playerState.lines.findLastIndex((l) => adjustedTime >= l.startTimeMs);

			if (activeIndex !== playerState.currentLineIndex) {
				playerState.currentLineIndex = activeIndex;
				playerState.currentLine = activeIndex !== -1 ? playerState.lines[activeIndex].text : '';
				playerState.currentTranslatedLine =
					activeIndex !== -1 ? playerState.translatedLines[activeIndex]?.text || '' : '';
			}
		} else {
			playerState.currentLineIndex = -1;
			playerState.currentLine = '';
			playerState.currentTranslatedLine = '';
		}
	}, 250);
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
}

export async function loadVideo(videoId: string, elementId: string, initialOffset?: number) {
	destroyExistingPlayer();
	resetPlayerState();

	playerState.videoId = videoId;
	playerState.isLoadingVideo = true;
	if (initialOffset) {
		playerState.timingOffset = initialOffset;
	}

	await loadYouTubeAPI();
	await loadAndApplyVideoDelay(videoId);

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
			onReady: (event) => handlePlayerReady(event, videoId),
			onStateChange: (event) => {
				playerState.isPlaying = event.data === YT.PlayerState.PLAYING;
				if (event.data === YT.PlayerState.BUFFERING) {
					playerState.isSeeking = true;
				} else if (
					event.data === YT.PlayerState.PLAYING ||
					event.data === YT.PlayerState.PAUSED ||
					event.data === YT.PlayerState.ENDED
				) {
					playerState.isSeeking = false;
					if (event.data === YT.PlayerState.PLAYING) {
						playerState.isLoadingVideo = false;
					} else if (event.data === YT.PlayerState.ENDED) {
						playerState.currentTime = playerState.duration;
					}
				}
			}
		}
	});
}

async function loadAndApplyVideoDelay(videoId: string) {
	const currentVideoUrl = `https://www.youtube.com/watch?v=${videoId}`;
	const storedDelay = await videoService.getVideoDelay(currentVideoUrl);
	if (storedDelay !== undefined) {
		playerState.timingOffset = storedDelay;
	}
}

async function fetchAndProcessLyrics(player: YT.Player) {
	playerState.lyricsState = LyricsStates.Loading;
	const videoData = player.getVideoData();
	const duration = player.getDuration();

	const result = await searchLyricsWithStrategies(videoData, duration);
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

	for (const strategy of strategies) {
		const result = await strategy(videoData, duration);
		if (result.found) return result;
	}

	return { found: false, synced: false, lyrics: [] };
}

async function tryCleanedTitle(videoData: YT.VideoData, duration: number): Promise<LyricsResult> {
	const cleanedTitle = removeJunkSuffixes(videoData.title);
	console.log(`Attempting lyric search with cleaned raw title: "${cleanedTitle}"`);

	return await getSyncedLyrics(cleanedTitle, '', duration);
}

async function tryParsedTitle(videoData: YT.VideoData, duration: number): Promise<LyricsResult> {
	console.log('Cleaned raw title search failed. Proceeding with full parsing logic.');

	const parsedTitle = parseTitle(videoData.title);
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
	const parsedTitle = parseTitle(videoData.title);
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
	// Update artist and track
	if (result.found && result.artistName && result.trackName) {
		playerState.artist = result.artistName;
		playerState.track = result.trackName;
	} else {
		const parsedTitle = parseTitle(videoData.title);
		playerState.artist = parsedTitle.artist || videoData.author;
		playerState.track = parsedTitle.track;
	}

	// Update lyrics state
	playerState.lyricsState = result.found ? LyricsStates.Found : LyricsStates.NotFound;
	playerState.lyricsAreSynced = result.synced;
	playerState.lines = result.lyrics;
	playerState.id = result.id || 0;
	playerState.userLang = getLanguage();
}

function initializePlayerProperties(player: YT.Player) {
	playerState.duration = player.getDuration();
	playerState.volume = player.getVolume();
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

async function handlePlayerReady(event: YT.PlayerEvent, videoId: string) {
	const player = event.target;
	setPlayer(player);

	await fetchAndProcessLyrics(player);

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
