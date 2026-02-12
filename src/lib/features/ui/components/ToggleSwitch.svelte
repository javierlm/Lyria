<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    checked: boolean;
    onchange?: (checked: boolean) => void;
    id?: string;
    label?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    icon?: Snippet;
  }

  let { checked, onchange, id, label, disabled = false, size = 'md', icon }: Props = $props();

  function toggle() {
    if (!disabled) {
      onchange?.(!checked);
    }
  }
</script>

<div class="toggle-switch" class:disabled class:size-sm={size === 'sm'}>
  {#if label || icon}
    <label class="toggle-label" for={id}>
      <span class="label-content">
        {#if icon}
          <span class="label-icon">
            {@render icon()}
          </span>
        {/if}
        {#if label}
          <span class="label-text">{label}</span>
        {/if}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        {id}
        {disabled}
        onclick={toggle}
        class="toggle-wrapper"
      >
        <span class="toggle-slider" class:checked></span>
      </button>
    </label>
  {:else}
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Toggle"
      {id}
      {disabled}
      onclick={toggle}
      class="toggle-wrapper"
    >
      <span class="toggle-slider" class:checked></span>
    </button>
  {/if}
</div>

<style>
  .toggle-switch {
    display: inline-flex;
    align-items: center;
  }

  .toggle-switch.disabled {
    opacity: 0.5;
    pointer-events: none;
  }

  .toggle-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    cursor: pointer;
    user-select: none;
    gap: 0.75rem;
  }

  .label-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .label-icon {
    display: flex;
    align-items: center;
    color: var(--text-color);
  }

  .label-text {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-color);
  }

  .toggle-wrapper {
    position: relative;
    width: 36px;
    height: 20px;
    flex-shrink: 0;
    cursor: pointer;
    border: none;
    padding: 0;
    background: transparent;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }

  /* Small size variant */
  .toggle-switch.size-sm .toggle-wrapper {
    width: 28px;
    height: 16px;
  }

  .toggle-switch.size-sm .toggle-slider:before {
    height: 10px;
    width: 10px;
  }

  .toggle-switch.size-sm .toggle-slider.checked:before {
    transform: translateX(12px);
  }

  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-color);
    transition:
      background-color 0.2s ease,
      transform 0.2s ease;
    border-radius: 20px;
  }

  .toggle-slider:before {
    position: absolute;
    content: '';
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
    background-color: var(--card-background);
    transition:
      transform 0.2s ease,
      background-color 0.2s ease;
    border-radius: 50%;
    box-shadow: 0 1px 3px var(--shadow-color);
  }

  .toggle-slider.checked {
    background: var(--primary-color, #3a86ff);
  }

  .toggle-slider.checked:before {
    transform: translateX(16px);
  }

  .toggle-wrapper:focus-visible .toggle-slider {
    outline: 2px solid var(--primary-color);
    outline-offset: 2px;
  }

  /* Hover state */
  .toggle-wrapper:hover .toggle-slider {
    background-color: var(--border-color-hover, rgba(255, 255, 255, 0.3));
  }

  .toggle-wrapper:hover .toggle-slider.checked {
    background: var(--primary-color, #3a86ff);
    filter: brightness(1.1);
  }

  /* Mobile: hide label text, show only icon */
  @media (max-width: 768px) {
    .label-text {
      display: none;
    }
  }
</style>
