<script lang="ts">
	import { playerState } from '$lib/stores/playerStore.svelte';
	import { seekTo } from '$lib/actions/playerActions';
	import { FileText, Translate } from 'phosphor-svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';

	let hoveredIndex: number | null = $state(null);
	let lyricsContainerRef: HTMLDivElement | null = $state(null);
	let lyricsContentRef: HTMLDivElement | null = $state(null);
	let lyricRowRefs: (HTMLDivElement | null)[] = $state([]);
	let activeLineOffset = $state(0);
	let activeLineHeight = $state(0);
	let windowWidth = $state(0);

	const iconSize = $derived(windowWidth > 768 ? 30 : 16);

	const adjustedTimes = $derived(
		playerState.lines.map((line) => Math.max(0, line.startTimeMs + playerState.timingOffset))
	);

	// Update the active line position whenever currentLineIndex changes or window is resized
	$effect(() => {
		// Reference windowWidth to make this effect react to window resizes
		void windowWidth; // Referencing windowWidth to make it a dependency, that's how Svelte works in an $effect rune

		const hasActiveLineWithText =
			playerState.currentLineIndex !== null &&
			playerState.currentLineIndex >= 0 &&
			playerState.lines[playerState.currentLineIndex]?.text;

		if (hasActiveLineWithText) {
			// Espera a que el navegador termine el layout
			requestAnimationFrame(() => {
				const activeRow = lyricRowRefs[playerState.currentLineIndex];
				const container = lyricsContentRef;
				if (activeRow && container) {
					const rowRect = activeRow.getBoundingClientRect();
					const containerRect = container.getBoundingClientRect();

					activeLineOffset = rowRect.top - containerRect.top + container.scrollTop;
					activeLineHeight = rowRect.height;
				}
			});
		} else {
			activeLineHeight = 0;
			activeLineOffset = 0;
		}
	});

	function formatTimestamp(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const hours = Math.floor(totalSeconds / 3600);
		const minutes = Math.floor((totalSeconds % 3600) / 60);
		const seconds = totalSeconds % 60;

		const formattedMinutes = minutes.toString().padStart(2, '0');
		const formattedSeconds = seconds.toString().padStart(2, '0');

		if (hours > 0) {
			const formattedHours = hours.toString().padStart(2, '0');
			return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
		}

		return `${formattedMinutes}:${formattedSeconds}`;
	}
</script>

<svelte:window bind:innerWidth={windowWidth} />

<div class="lyrics-container" bind:this={lyricsContainerRef}>
	{#if playerState.translatedLines.length > 0}
		<div class="language-selector">
			<LanguageSelector />
		</div>
	{/if}
	<div class="lyrics-header">
		<h2 class="original-header"><FileText size={iconSize} weight="bold" /> Original Lyrics</h2>
		<div class="translated-header-container">
			<h2 class="translated-header">
				<Translate size={iconSize} weight="bold" /> Translated Lyrics
			</h2>
		</div>
	</div>

	<div class="lyrics-content" bind:this={lyricsContentRef}>
		{#if playerState.currentLineIndex !== null && playerState.currentLineIndex >= 0 && activeLineHeight > 0}
			<div
				class="active-line-background"
				style="transform: translateY({activeLineOffset}px); height: {activeLineHeight}px;"
			></div>
		{/if}

		{#each playerState.lines as line, i (i)}
			{#if line.text}
				<div
					class="lyric-row"
					class:hovered={hoveredIndex === i}
					class:current={playerState.currentLineIndex === i}
					class:clickable={playerState.lyricsAreSynced}
					bind:this={lyricRowRefs[i]}
					onmouseenter={() => (hoveredIndex = i)}
					onmouseleave={() => (hoveredIndex = null)}
					onclick={() => {
						if (playerState.lyricsAreSynced) seekTo(adjustedTimes[i] / 1000);
					}}
					onkeydown={(e) => {
						if (playerState.lyricsAreSynced && (e.key === 'Enter' || e.key === ' ')) {
							seekTo(adjustedTimes[i] / 1000);
						}
					}}
					role="button"
					tabindex="0"
				>
					<button
						type="button"
						class="lyric-line original"
						class:not-synced={!playerState.lyricsAreSynced}
					>
						<span class="lyric-text-container">
							<span class="sizer">{line.text}</span>
							<span class="content">{line.text}</span>
						</span>
					</button>

					{#if playerState.lyricsAreSynced}
						<strong class="timestamp">
							<span>{formatTimestamp(adjustedTimes[i])}</span>
						</strong>
					{/if}

					<button
						type="button"
						class="lyric-line translated"
						class:not-synced={!playerState.lyricsAreSynced}
					>
						<span class="lyric-text-container">
							<span class="sizer">{playerState.translatedLines[i]?.text || ''}</span>
							<span class="content">{playerState.translatedLines[i]?.text || ''}</span>
						</span>
					</button>
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.lyrics-container {
		margin: 2rem auto;
		max-width: 1200px;
		padding: 0 1rem;
		background-color: var(--card-background);
		border-radius: 12px;
		box-shadow: 0 10px 30px var(--shadow-color);
		padding: 2rem;
		position: relative;
		overflow: hidden;
	}

	.active-line-background {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		background: linear-gradient(
			90deg,
			rgba(239, 68, 68, 0.15) 0%,
			rgba(239, 68, 68, 0.2) 50%,
			rgba(239, 68, 68, 0.15) 100%
		);
		border-radius: 8px;
		transition:
			transform 0.5s cubic-bezier(0.4, 0, 0.2, 1),
			height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
		pointer-events: none;
		z-index: 0;
	}

	.lyrics-header {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-color);
		align-items: start;
	}

	.lyrics-content {
		position: relative;
	}

	.lyrics-header h2 {
		text-align: center;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.translated-header-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		position: relative;
	}

	.lyric-row {
		box-sizing: border-box;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		border-bottom: 1px solid var(--border-color);
		gap: 0.5rem;
		padding: 0;
		transition: border-radius 0.3s ease-in-out;
		position: relative;
		z-index: 1;
		min-height: 3rem;
	}

	.lyric-row.clickable {
		cursor: pointer;
	}

	.lyric-row:last-child {
		border-bottom: none;
	}

	.lyric-row.hovered {
		background-color: rgba(var(--primary-color), 0.05);
		border-radius: 8px;
	}

	.lyric-row.current {
		color: var(--primary-color);
		font-weight: bold;
	}

	/* .lyric-row.current .lyric-line {
		transform: scale(1.02);
	} */

	.lyric-line {
		margin: 0;
		line-height: 1.5;
		cursor: pointer;
		padding: 0.8rem 2rem;
		border-radius: 8px;
		background: none;
		border: none;
		font: inherit;
		color: inherit;
		text-align: center;
		flex: 1;
		box-sizing: border-box;
		transition:
			color 0.3s ease-in-out,
			font-weight 0.3s ease-in-out,
			transform 0.2s ease-in-out;
		white-space: pre-wrap;
		align-items: baseline;
		align-self: stretch;
		display: flex;
		justify-content: center;
		align-items: center;
		height: 100%;
	}

	.lyric-line > * {
		display: inline;
	}

	.lyric-line.not-synced {
		cursor: default;
	}

	.lyric-text-container {
		display: grid;
		grid-template-areas: 'text';
		justify-content: center;
		align-items: center;
		text-align: center;
	}

	.lyric-text-container > .sizer,
	.lyric-text-container > .content {
		grid-area: text;
		white-space: pre-wrap;
	}

	.lyric-text-container > .sizer {
		font-weight: bold;
		visibility: hidden;
	}

	.timestamp {
		font-weight: bold;
		color: black;
		text-align: center;
	}

	@media (max-width: 768px) {
		.lyrics-container {
			padding: 1rem;
			margin: 1rem 0;
		}

		.lyrics-header {
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
		}

		.lyric-line {
			padding: 0.6rem 0.5rem;
			font-size: 0.8rem;
		}

		.lyrics-header h2 {
			font-size: 1rem;
		}
	}

	.language-selector {
		width: 100%;
		display: flex;
		justify-content: center;
		margin-bottom: 1rem;
	}
</style>
