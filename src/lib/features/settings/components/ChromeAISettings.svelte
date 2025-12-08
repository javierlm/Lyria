<script lang="ts">
	import { translationStore } from '../stores/translationStore.svelte';
	import Check from 'phosphor-svelte/lib/Check';
	import DownloadSimple from 'phosphor-svelte/lib/DownloadSimple';
	import WarningCircle from 'phosphor-svelte/lib/WarningCircle';
	import LL from '$i18n/i18n-svelte';

	let { class: className = '' } = $props();
</script>

{#if translationStore.isChromeAISupported}
	<div class="chrome-ai-settings {className}">
		<div class="setting-row">
			<label class="toggle-label" for="chrome-ai-toggle">
				<span class="label-text">
					{$LL.chromeAI.useBrowserAI()}
					<span class="beta-badge">{$LL.chromeAI.beta()}</span>
				</span>
				<div class="toggle-wrapper">
					<input
						type="checkbox"
						id="chrome-ai-toggle"
						checked={translationStore.useChromeAI}
						onchange={(e) => translationStore.toggleChromeAI(e.currentTarget.checked)}
					/>
					<span class="toggle-slider"></span>
				</div>
			</label>
		</div>

		<p class="disclaimer">{$LL.chromeAI.disclaimer()}</p>

		{#if translationStore.useChromeAI}
			<div class="status-container">
				{#if translationStore.modelStatus === 'downloading' && translationStore.downloadProgress}
					<div class="download-progress">
						<div class="progress-info">
							<span class="status-text">
								<DownloadSimple size={12} weight="bold" />
								{$LL.chromeAI.downloading()}
							</span>
							<span class="percentage">
								{Math.round(
									(translationStore.downloadProgress.loaded /
										translationStore.downloadProgress.total) *
										100
								)}%
							</span>
						</div>
						<div class="progress-bar-bg">
							<div
								class="progress-bar-fill"
								style="width: {(translationStore.downloadProgress.loaded /
									translationStore.downloadProgress.total) *
									100}%"
							></div>
						</div>
					</div>
				{:else if translationStore.modelStatus === 'ready'}
					<div class="status-ready">
						<Check size={12} weight="bold" />
						<span>{$LL.chromeAI.modelReady()}</span>
					</div>
				{:else if translationStore.modelStatus === 'error'}
					<div class="status-error">
						<WarningCircle size={12} weight="bold" />
						<span>{$LL.chromeAI.modelError()}</span>
					</div>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.chrome-ai-settings {
		padding: 8px 10px;
		background: rgba(255, 255, 255, 0.03);
		border-radius: 8px;
		border: 1px solid rgba(255, 255, 255, 0.08);
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.toggle-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		cursor: pointer;
		user-select: none;
	}

	.label-text {
		font-size: 0.75rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--text-color, #fff);
	}

	.beta-badge {
		font-size: 0.55rem;
		background: linear-gradient(135deg, #ffb703, #fb8500);
		color: #000;
		padding: 1px 4px;
		border-radius: 3px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}

	/* Toggle Switch */
	.toggle-wrapper {
		position: relative;
		width: 36px;
		height: 20px;
	}

	.toggle-wrapper input {
		opacity: 0;
		width: 0;
		height: 0;
	}

	.toggle-slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(255, 255, 255, 0.2);
		transition: 0.3s;
		border-radius: 20px;
	}

	.toggle-slider:before {
		position: absolute;
		content: '';
		height: 14px;
		width: 14px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.3s;
		border-radius: 50%;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	input:checked + .toggle-slider {
		background: var(--primary-color, #3a86ff);
	}

	input:checked + .toggle-slider:before {
		transform: translateX(16px);
	}

	/* Status & Progress */
	.status-container {
		margin-top: 8px;
		padding-top: 8px;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.7rem;
	}

	.download-progress {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.progress-info {
		display: flex;
		justify-content: space-between;
		color: rgba(255, 255, 255, 0.8);
	}

	.status-text {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.progress-bar-bg {
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-bar-fill {
		height: 100%;
		background: var(--primary-color, #3a86ff);
		transition: width 0.3s ease-out;
	}

	.status-ready {
		display: flex;
		align-items: center;
		gap: 4px;
		color: #4cc9f0;
	}

	.status-error {
		display: flex;
		align-items: center;
		gap: 4px;
		color: #ef476f;
	}

	.disclaimer {
		margin-top: 8px;
		font-size: 0.65rem;
		color: rgba(255, 255, 255, 0.5);
		line-height: 1.4;
	}
</style>
