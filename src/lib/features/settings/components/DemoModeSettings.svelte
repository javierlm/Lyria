<script lang="ts">
  import { demoStore } from './../stores/demoStore.svelte';
  import LL from '$i18n/i18n-svelte';
</script>

<div class="demo-mode-settings">
  <div class="setting-row">
    <label class="toggle-label" for="demo-mode-toggle">
      <span class="label-text">
        {$LL.demoMode.title()}
      </span>
      <div class="toggle-wrapper">
        <input
          type="checkbox"
          id="demo-mode-toggle"
          checked={demoStore.isDemoMode}
          onchange={(e) =>
            e.currentTarget.checked ? demoStore.activateDemoMode() : demoStore.deactivateDemoMode()}
        />
        <span class="toggle-slider"></span>
      </div>
    </label>
  </div>

  <p class="description">{$LL.demoMode.description()}</p>
</div>

<style>
  .demo-mode-settings {
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
    color: var(--text-color, #fff);
  }

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

  .description {
    margin-top: 8px;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.5);
    line-height: 1.4;
  }
</style>
