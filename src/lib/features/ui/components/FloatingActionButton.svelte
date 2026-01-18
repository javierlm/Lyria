<script lang="ts">
  const {
    IconComponent,
    visible = true,
    onClick,
    ariaLabel = '',
    bottom = '20px',
    right = '20px',
    iconSize = 32
  } = $props();

  let classes = $derived(`floating-action-button ${visible ? 'visible' : 'hidden'}`);
</script>

<button
  class={classes}
  style="bottom: {bottom}; right: {right};"
  onclick={onClick}
  aria-label={ariaLabel}
>
  {#snippet icon()}
    {@const Icon = IconComponent}
    <Icon size={iconSize} />
  {/snippet}
  {@render icon()}
</button>

<style>
  .floating-action-button {
    position: fixed;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: var(--on-primary-color);
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    font-size: 24px;
    display: flex;
    justify-content: center;
    align-items: center;
    transition:
      opacity 0.2s ease,
      transform 0.2s ease,
      filter 0.2s ease;
    z-index: 1000;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  }

  .floating-action-button.hidden {
    opacity: 0;
    transform: scale(0.8);
    visibility: hidden;
    pointer-events: none;
  }

  .floating-action-button.visible {
    opacity: 1;
    transform: scale(1);
    visibility: visible;
    pointer-events: auto;
    animation: floatIn 0.4s ease-out;
  }

  @keyframes floatIn {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(20px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .floating-action-button:hover {
    transform: scale(1.1);
    filter: brightness(1.1);
    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.4);
  }

  .floating-action-button:focus-visible {
    outline: 3px solid var(--primary-color);
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    .floating-action-button {
      width: 40px;
      height: 40px;
    }
  }
</style>
