<script lang="ts">
	import { playerState } from '$lib/stores/playerStore.svelte';
	import { adjustTiming, syncTimingToFirstLine } from '$lib/actions/playerActions';
	import { MinusCircle, PlusCircle, ArrowsClockwise } from 'phosphor-svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { debounce } from '$lib/utils';
	import LL from '$i18n/i18n-svelte';

	let editing = $state(false);
	let inputElement: HTMLInputElement | null = $state(null);
	let inputValue: string = $state('');
	let delayInterval: ReturnType<typeof setInterval>;

	// Debounced function to update the URL without causing a full reload.
	const updateUrl = debounce((...args: unknown[]) => {
		const raw = args[0];
		const offset = typeof raw === 'number' ? raw : Number(raw);
		if (isNaN(offset)) return;
		const newUrl = new URL($page.url);
		if (offset === 0) {
			newUrl.searchParams.delete('offset');
		} else {
			newUrl.searchParams.set('offset', offset.toString());
		}
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto(newUrl.toString(), { replaceState: true, noScroll: true });
	}, 300);

	$effect(() => {
		updateUrl(playerState.timingOffset);
	});

	function startEditing() {
		editing = true;
		inputValue = (playerState.timingOffset / 1000).toFixed(1);
		requestAnimationFrame(() => {
			inputElement?.select();
		});
	}

	function handleBlur(event: FocusEvent & { currentTarget: HTMLInputElement }) {
		editing = false;
		const rawValue = event.currentTarget.value.replace(',', '.');
		const parsedValue = parseFloat(rawValue);

		if (!isNaN(parsedValue)) {
			const newTimingOffset = Math.round(parsedValue * 1000);
			adjustTiming(newTimingOffset);
		} else {
			inputValue = (playerState.timingOffset / 1000).toFixed(1);
		}
	}

	function handleKeydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (event.key === 'Enter') {
			event.currentTarget.blur();
		} else if (event.key === 'Escape') {
			editing = false;
		}
	}

	function updateTimingOffset(delta: number) {
		adjustTiming(playerState.timingOffset + delta);
	}

	function startDelayChange(delta: number) {
		delayInterval = setInterval(() => {
			updateTimingOffset(delta);
		}, 100);
	}

	function stopDelayChange() {
		clearInterval(delayInterval);
	}
</script>

<div class="timing-controls">
	<div class="delay-controls">
		<button
			onclick={() => updateTimingOffset(-100)}
			onmousedown={() => startDelayChange(-100)}
			onmouseup={stopDelayChange}
			onmouseleave={stopDelayChange}
			aria-label={$LL.controls.decreaseTimingOffset()}
			title={$LL.controls.decreaseTimingOffset()}
		>
			<MinusCircle size="24" weight="bold" />
		</button>
		<div class="center-control-wrapper">
			{#if editing}
				<div class="input-wrapper">
					<input
						bind:this={inputElement}
						type="text"
						bind:value={inputValue}
						onblur={handleBlur}
						onkeydown={handleKeydown}
						class="timing-input"
					/>
					<span class="unit-display">s</span>
				</div>
			{:else}
				<button onclick={startEditing} class="timing-display"
					>{(playerState.timingOffset / 1000).toFixed(1)}s</button
				>
			{/if}
		</div>
		<button
			onclick={() => updateTimingOffset(100)}
			onmousedown={() => startDelayChange(100)}
			onmouseup={stopDelayChange}
			onmouseleave={stopDelayChange}
			aria-label={$LL.controls.increaseTimingOffset()}
			title={$LL.controls.increaseTimingOffset()}
		>
			<PlusCircle size="24" weight="bold" />
		</button>
	</div>
	<button
		onclick={syncTimingToFirstLine}
		disabled={!playerState.lyricsAreSynced}
		class="sync-button"
		aria-label={$LL.controls.syncWithCurrentTime()}
		title={$LL.controls.syncWithCurrentTime()}
	>
		<ArrowsClockwise size="20" weight="bold" />
		{$LL.controls.syncWithCurrentTime()}
	</button>
</div>

<style>
	.timing-controls {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1rem;
	}

	.delay-controls {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
	}

	.delay-controls button {
		font-size: 1.5rem;
		width: 40px;
		height: 40px;
		cursor: pointer;
		border-radius: 50%;
		border: none;
		background-color: transparent;
		color: var(--primary-color);
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 0;
	}

	.delay-controls button:hover {
		color: var(--primary-color-hover);
	}

	.sync-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
		color: white;
		border: none;
		padding: 10px 15px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 1rem;
		transition: all 0.3s ease;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
		height: 42px;
	}

	.sync-button:hover:not(:disabled) {
		background: linear-gradient(135deg, var(--primary-color-hover), var(--secondary-color));
	}

	.sync-button:disabled {
		background-color: #fcdada;
		cursor: not-allowed;
	}

	.timing-controls .timing-display,
	.timing-input {
		font-size: 1.2rem;
		text-align: center;
		font-family: monospace;
		color: var(--text-color);
	}

	.timing-display {
		cursor: pointer;
		padding: 4px 6px;
		background-color: transparent;
		border: none;
		width: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.timing-input {
		width: 60px;
		border: 1px solid var(--primary-color);
		border-radius: 4px;
		padding: 2px 4px;
		background-color: transparent;
	}

	.input-wrapper {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		width: 100%;
	}

	.unit-display {
		font-size: 1.2rem;
		font-family: monospace;
		color: var(--text-color);
	}

	.center-control-wrapper {
		width: 84px;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	@media (max-width: 768px) {
		.sync-button {
			font-size: 0.9rem;
		}
	}
</style>
