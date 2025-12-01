<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import IconPlay from 'phosphor-svelte/lib/Play';
	import IconPause from 'phosphor-svelte/lib/Pause';
	import SpeakerHigh from 'phosphor-svelte/lib/SpeakerHigh';
	import SpeakerSlash from 'phosphor-svelte/lib/SpeakerSlash';
	import IconArrowsOutSimple from 'phosphor-svelte/lib/ArrowsOutSimple';
	import IconArrowsInSimple from 'phosphor-svelte/lib/ArrowsInSimple';
	import { Eye, EyeSlash } from 'phosphor-svelte';
	import LL from '$i18n/i18n-svelte';

	import { playerState } from '$lib/features/player/stores/playerStore.svelte';
	import {
		play,
		pause,
		seekTo,
		setVolume,
		mute,
		unMute
	} from '$lib/features/player/services/playerActions';

	const dispatch = createEventDispatcher();

	function togglePlayPause() {
		if (playerState.isPlaying) {
			pause();
		} else {
			play();
		}
	}

	function handleSeek(event: Event) {
		const target = event.target as HTMLInputElement;
		const seekTime = parseFloat(target.value);
		seekTo(seekTime);
	}

	function handleVolumeChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newVolume = parseInt(target.value, 10);
		setVolume(newVolume);
		if (newVolume === 0) {
			mute();
		} else if (playerState.isMuted && newVolume > 0) {
			unMute();
		}
	}

	function toggleMute() {
		if (playerState.isMuted) {
			unMute();
			if (playerState.volume === 0) {
				setVolume(50);
			}
		} else {
			mute();
		}
	}

	function toggleFullscreen() {
		dispatch('toggleFullscreen');
	}

	function formatTime(seconds: number): string {
		if (isNaN(seconds) || seconds === null || seconds === undefined) {
			seconds = 0;
		}
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		const formattedSeconds = remainingSeconds < 10 ? `0${remainingSeconds}` : `${remainingSeconds}`;
		return `${minutes}:${formattedSeconds}`;
	}
</script>

<div class="controls-container">
	<button
		class="play-pause-btn"
		onclick={togglePlayPause}
		aria-label={playerState.isPlaying ? $LL.controls.pause() : $LL.controls.play()}
		title={playerState.isPlaying ? $LL.controls.pause() : $LL.controls.play()}
	>
		{#if playerState.isPlaying}
			<IconPause size="20" weight="bold" />
		{:else}
			<IconPlay size="20" weight="bold" />
		{/if}
	</button>

	<div class="time-display">{formatTime(playerState.currentTime)}</div>
	<input
		type="range"
		min="0"
		max={playerState.duration}
		value={playerState.currentTime}
		step="0.1"
		oninput={handleSeek}
		class="seek-bar"
		style="--progress: {(playerState.currentTime / playerState.duration) * 100 || 0}%;"
	/>
	<div class="time-display">{formatTime(playerState.duration)}</div>

	<div class="volume-controls">
		<button
			class="volume-btn"
			onclick={toggleMute}
			aria-label={playerState.isMuted || playerState.volume === 0
				? $LL.controls.unmute()
				: $LL.controls.mute()}
			title={playerState.isMuted || playerState.volume === 0
				? $LL.controls.unmute()
				: $LL.controls.mute()}
		>
			{#if playerState.isMuted || playerState.volume === 0}
				<SpeakerSlash size="20" weight="bold" />
			{:else}
				<SpeakerHigh size="20" weight="bold" />
			{/if}
		</button>
		<input
			type="range"
			min="0"
			max="100"
			bind:value={playerState.volume}
			oninput={handleVolumeChange}
			class="volume-bar"
			style="--volume-progress: {playerState.volume || 0}%;"
		/>
	</div>

	<div class="subtitles-controls">
		<button
			class="subtitles-btn"
			onpointerdown={(event) => {
				if (event.button === 0) {
					playerState.showOriginalSubtitle = !playerState.showOriginalSubtitle;
				}
			}}
			title={playerState.showOriginalSubtitle
				? $LL.lyrics.hideOriginal()
				: $LL.lyrics.showOriginal()}
		>
			{#if playerState.showOriginalSubtitle}
				<Eye size="20" weight="bold" />
			{:else}
				<EyeSlash size="20" weight="bold" />
			{/if}
			<span>{$LL.controls.original()}</span>
		</button>
		<button
			class="subtitles-btn"
			onpointerdown={(event) => {
				if (event.button === 0) {
					playerState.showTranslatedSubtitle = !playerState.showTranslatedSubtitle;
				}
			}}
			title={playerState.showTranslatedSubtitle
				? $LL.lyrics.hideTranslated()
				: $LL.lyrics.showTranslated()}
		>
			{#if playerState.showTranslatedSubtitle}
				<Eye size="20" weight="bold" />
			{:else}
				<EyeSlash size="20" weight="bold" />
			{/if}
			<span>{$LL.controls.translated()}</span>
		</button>
	</div>

	<button
		class="fullscreen-btn"
		onclick={toggleFullscreen}
		aria-label={playerState.isFullscreen
			? $LL.controls.exitFullscreen()
			: $LL.controls.enterFullscreen()}
		title={playerState.isFullscreen
			? $LL.controls.exitFullscreen()
			: $LL.controls.enterFullscreen()}
	>
		{#if playerState.isFullscreen}
			<IconArrowsInSimple size="20" weight="bold" />
		{:else}
			<IconArrowsOutSimple size="20" weight="bold" />
		{/if}
	</button>
</div>

<style>
	.controls-container {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		display: flex;
		align-items: center;
		padding: 10px;
		background: rgba(0, 0, 0, 0.7);
		color: white;
		box-sizing: border-box;
	}

	.play-pause-btn,
	.volume-btn,
	.fullscreen-btn,
	.subtitles-btn {
		background: none;
		border: none;
		color: white;
		cursor: pointer;
		padding: 5px;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s ease;
		border-radius: 50%;
		box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
	}

	.play-pause-btn:hover,
	.volume-btn:hover,
	.fullscreen-btn:hover,
	.subtitles-btn:hover {
		background-color: rgba(var(--primary-color-rgb), 0.3);
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
	}

	.subtitles-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
	}

	.subtitles-btn {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 5px 10px;
		border-radius: 5px;
	}
	.fullscreen-btn {
		margin-left: 1rem;
	}

	.time-display {
		margin: 0 10px;
		font-size: 0.9rem;
		min-width: 40px;
		text-align: center;
	}

	.seek-bar {
		flex-grow: 1;
		-webkit-appearance: none;
		appearance: none;
		height: 8px;
		background:
			linear-gradient(to right, transparent var(--progress, 0%), #555 var(--progress, 0%)),
			linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		outline: none;
		opacity: 0.7;
		transition: opacity 0.2s;
		margin: 0 10px;
		border-radius: 4px;
	}

	.seek-bar:hover {
		opacity: 1;
	}

	.seek-bar::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		cursor: pointer;
		transition: transform 0.2s ease-in-out;
	}

	.seek-bar:hover::-webkit-slider-thumb {
		transform: scale(1.2);
	}

	.seek-bar::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		cursor: pointer;
		transition: transform 0.2s ease-in-out;
	}

	.seek-bar:hover::-moz-range-thumb {
		transform: scale(1.2);
	}

	.volume-bar {
		width: 80px;
		-webkit-appearance: none;
		appearance: none;
		height: 4px;
		background:
			linear-gradient(
				to right,
				transparent var(--volume-progress, 0%),
				#555 var(--volume-progress, 0%)
			),
			linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		outline: none;
		opacity: 0.7;
		transition: opacity 0.2s;
		margin-left: 10px;
		border-radius: 4px;
	}

	.volume-bar:hover {
		opacity: 1;
	}

	.volume-bar::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		cursor: pointer;
	}

	.volume-bar::-moz-range-thumb {
		width: 15px;
		height: 15px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		cursor: pointer;
	}

	.volume-controls {
		display: flex;
		align-items: center;
	}

	@media (max-width: 768px) {
		.subtitles-controls {
			display: none;
		}

		.player-container.fullscreen .subtitles-controls {
			display: flex;
		}

		.controls-container {
			padding: 5px;
		}

		.volume-bar {
			display: none;
		}

		.time-display {
			margin: 0 5px;
			font-size: 0.8rem;
			min-width: 35px;
		}

		.seek-bar {
			margin: 0 5px;
		}
	}
</style>
