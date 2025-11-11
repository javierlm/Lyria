import { getSyncedLyrics } from '$lib/lrclib';
import { videoService } from '$lib/data/videoService';
import { getLanguage, setLanguage } from '$lib/language';
import { getPlayer, setPlayer, playerState } from '$lib/stores/playerStore.svelte';
import { parseTitle } from '$lib/utils';

let syncInterval: NodeJS.Timeout;

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
				id: playerState.id
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

		const { translatedText } = await response.json();

		if (!translatedText || !Array.isArray(translatedText)) {
			throw new Error('Invalid translatedText received from server.');
		}

		if (timestamps.length === translatedText.length) {
			playerState.translatedLines = timestamps.map((timestamp, index) => ({
				startTimeMs: timestamp,
				text: translatedText[index]
			}));
			playerState.isTranslatedTextReady = true;
		} else {
			console.warn('Mismatch in line count between original and translated lyrics');
		}
	} catch (error) {
		console.error('Translation failed:', error);
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
		if (!player) return;

		playerState.currentTime = player.getCurrentTime();

		if (playerState.lyricsAreSynced && playerState.lines.length > 0) {
			const t = playerState.currentTime * 1000;
			const adjustedTime = t + playerState.timingOffset;
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
	playerState.duration = 0;
	playerState.currentTime = 0;
	playerState.isPlaying = false;
}

export async function loadVideo(videoId: string, elementId: string, initialOffset?: number) {
	destroyExistingPlayer();
	resetPlayerState();

	playerState.videoId = videoId;
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

async function updateVideoMetadata(player: YT.Player) {
	const videoData = player.getVideoData();
	const parsed = parseTitle(videoData.title);
	playerState.artist = parsed.artist;
	playerState.track = parsed.track;
}

async function fetchAndProcessLyrics(player: YT.Player) {
	let result = await getSyncedLyrics(playerState.track, playerState.artist, player.getDuration());

	if (!result.found) {
		console.log(
			`No lyrics found for "${playerState.track}" by "${playerState.artist}". Retrying with inverted parameters.`
		);
		result = await getSyncedLyrics(playerState.artist, playerState.track, player.getDuration());
		if (result.lyrics.length > 0) {
			console.log(`Successfully found lyrics with inverted parameters.`);
			[playerState.artist, playerState.track] = [playerState.track, playerState.artist];
		}
	}

	playerState.lyricsAreSynced = result.synced;
	playerState.lines = result.lyrics;
	playerState.id = result.id || 0;

	if (playerState.lines.length > 0) {
		const userLang = getLanguage();
		playerState.userLang = userLang;
		console.log('ID LRCLib: ', playerState.id);
		await translateLyrics(userLang);
	}
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
	console.log('YouTube Player onReady event fired for videoId:', videoId);
	const player = event.target;
	setPlayer(player);

	await updateVideoMetadata(player);
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
		player.seekTo(time, true);
		playerState.currentTime = time;

		if (playerState.lyricsAreSynced && playerState.lines.length > 0) {
			const t = time * 1000;
			const adjustedTime = t + playerState.timingOffset;
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
	playerState.timingOffset = offset;
	const videoUrl = `https://www.youtube.com/watch?v=${playerState.videoId}`;
	videoService.setVideoDelay(videoUrl, offset);
}

export function toggleFullscreen(element: HTMLElement | null) {
	if (!element) return;

	if (!document.fullscreenElement) {
		element.requestFullscreen().catch((err) => {
			console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
		});
	} else {
		document.exitFullscreen();
	}
}

export function syncTimingToFirstLine() {
	if (!playerState.lyricsAreSynced) return;
	const player = getPlayer();
	if (!player) return;

	const currentTime = player.getCurrentTime() * 1000;
	const firstLine = playerState.lines[0];
	if (firstLine) {
		const newTimingOffset = firstLine.startTimeMs - currentTime;
		const roundedTimingOffset = Math.round(newTimingOffset);
		adjustTiming(roundedTimingOffset);
	}
}
