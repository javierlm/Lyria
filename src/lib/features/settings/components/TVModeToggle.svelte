<script lang="ts">
  import MonitorPlay from 'phosphor-svelte/lib/MonitorPlay';
  import ToggleSwitch from '$lib/features/ui/components/ToggleSwitch.svelte';
  import { tvModeStore } from '$lib/features/settings/stores/tvModeStore.svelte';

  let { navId }: { navId?: string } = $props();

  const title = $derived.by(() => {
    if (tvModeStore.preference === 'auto') {
      return tvModeStore.autoDetected ? 'TV mode enabled automatically' : 'TV mode automatic';
    }

    return tvModeStore.enabled ? 'TV mode enabled' : 'TV mode disabled';
  });

  function handleChange(enabled: boolean) {
    tvModeStore.setEnabled(enabled);
  }
</script>

<div class="tv-mode-toggle" {title}>
  <ToggleSwitch
    checked={tvModeStore.enabled}
    onchange={handleChange}
    topNavId={navId}
    label="TV"
    size="sm"
  >
    {#snippet icon()}
      <MonitorPlay size={16} weight="bold" />
    {/snippet}
  </ToggleSwitch>
</div>

<style>
  .tv-mode-toggle {
    display: inline-flex;
    align-items: center;
    padding: 0.375rem 0.625rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--card-background) 88%, transparent);
    border: 1px solid var(--border-color);
  }

  .tv-mode-toggle :global(.label-text) {
    display: inline;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.7rem;
  }

  .tv-mode-toggle :global(.toggle-label) {
    gap: 0.625rem;
  }

  :global(html.tv-mode) .tv-mode-toggle {
    min-height: var(--top-control-height);
    padding: 0.5rem 0.875rem;
    background: var(--tv-surface-background);
    border-color: var(--tv-surface-border);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
  }

  :global(html.tv-mode) .tv-mode-toggle :global(.label-text) {
    font-size: 0.82rem;
    font-weight: 700;
  }

  :global(html.tv-mode) .tv-mode-toggle :global(.toggle-wrapper) {
    width: 40px;
    height: 22px;
  }

  :global(html.tv-mode) .tv-mode-toggle :global(.toggle-slider:before) {
    width: 16px;
    height: 16px;
  }

  :global(html.tv-mode) .tv-mode-toggle :global(.toggle-slider.checked:before) {
    transform: translateX(18px);
  }
</style>
