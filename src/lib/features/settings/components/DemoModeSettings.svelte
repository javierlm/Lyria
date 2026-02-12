<script lang="ts">
  import { demoStore } from './../stores/demoStore.svelte';
  import ToggleSwitch from '$lib/features/ui/components/ToggleSwitch.svelte';
  import LL from '$i18n/i18n-svelte';

  function handleToggle(checked: boolean) {
    if (checked) {
      demoStore.activateDemoMode();
    } else {
      demoStore.deactivateDemoMode();
    }
  }
</script>

<div class="demo-mode-settings">
  <div class="setting-row">
    <ToggleSwitch
      checked={demoStore.isDemoMode}
      onchange={handleToggle}
      id="demo-mode-toggle"
      label={$LL.demoMode.title()}
    />
  </div>

  <p class="description">{$LL.demoMode.description()}</p>
</div>

<style>
  .demo-mode-settings {
    padding: 8px 10px;
    background: var(--card-background);
    border-radius: 8px;
    border: 1px solid var(--border-color);
  }

  .setting-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .description {
    margin-top: 8px;
    font-size: 0.65rem;
    color: var(--text-color);
    opacity: 0.6;
    line-height: 1.4;
  }
</style>
