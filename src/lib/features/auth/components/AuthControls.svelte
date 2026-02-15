<script lang="ts">
  import { authClient } from '$lib/features/auth/services/authClient';
  import { authStore } from '$lib/features/auth/stores/authStore.svelte';
  import { invalidateAll } from '$app/navigation';
  import { fade, fly } from 'svelte/transition';
  import X from 'phosphor-svelte/lib/X';
  import UserCircle from 'phosphor-svelte/lib/UserCircle';
  import { portal } from '$lib/features/ui/actions/portal';
  import LL from '$i18n/i18n-svelte';
  import ProviderIcon from './ProviderIcon.svelte';

  type ProviderId = 'google' | 'microsoft' | 'spotify' | 'deezer';

  const providers: Array<{ id: ProviderId; label: string }> = [
    { id: 'google', label: 'Google' },
    { id: 'microsoft', label: 'Microsoft' },
    { id: 'spotify', label: 'Spotify' },
    { id: 'deezer', label: 'Deezer' }
  ];

  let isPanelOpen = $state(false);
  let isLoading = $state(false);
  let statusMessage = $state('');
  let email = $state('');
  let password = $state('');
  let name = $state('');
  let useSignUp = $state(false);

  $effect(() => {
    if (isPanelOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }

    document.body.style.overflow = '';
  });

  function closePanel(): void {
    isPanelOpen = false;
    statusMessage = '';
  }

  function handleDialogKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      closePanel();
    }
  }

  function resolveCallbackURL(): string {
    if (typeof window === 'undefined') {
      return '/';
    }

    return `${window.location.pathname}${window.location.search}`;
  }

  async function signInWithProvider(provider: ProviderId): Promise<void> {
    isLoading = true;
    statusMessage = '';

    try {
      const result = await authClient.signIn.social({
        provider,
        callbackURL: resolveCallbackURL()
      });

      if (result?.error) {
        statusMessage = result.error.message || $LL.auth.errors.signInFailed();
      }
    } catch {
      statusMessage = $LL.auth.errors.signInFailed();
    } finally {
      isLoading = false;
    }
  }

  async function submitEmailAuth(): Promise<void> {
    if (!email.trim() || !password) {
      statusMessage = $LL.auth.errors.emailPasswordRequired();
      return;
    }

    if (useSignUp && !name.trim()) {
      statusMessage = $LL.auth.errors.nameRequired();
      return;
    }

    isLoading = true;
    statusMessage = '';

    try {
      const result = useSignUp
        ? await authClient.signUp.email({
            name: name.trim(),
            email: email.trim(),
            password,
            callbackURL: resolveCallbackURL()
          })
        : await authClient.signIn.email({
            email: email.trim(),
            password,
            callbackURL: resolveCallbackURL()
          });

      if (result?.error) {
        statusMessage = result.error.message || $LL.auth.errors.authFailed();
        return;
      }

      isPanelOpen = false;
      email = '';
      password = '';
      name = '';
      await invalidateAll();
    } catch {
      statusMessage = $LL.auth.errors.authFailed();
    } finally {
      isLoading = false;
    }
  }

  async function signOut(): Promise<void> {
    isLoading = true;
    statusMessage = '';

    try {
      const result = await authClient.signOut();
      if (result?.error) {
        statusMessage = result.error.message || $LL.auth.errors.signOutFailed();
        return;
      }

      isPanelOpen = false;
      await invalidateAll();
    } catch {
      statusMessage = $LL.auth.errors.signOutFailed();
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:window onkeydown={handleDialogKeydown} />

<div class="auth-controls">
  {#if authStore.isAuthenticated}
    <div class="user-pill" title={authStore.user?.email ?? ''}>
      <span class="user-name">
        {authStore.user?.name ?? authStore.user?.email ?? $LL.auth.account()}
      </span>
      <button class="auth-btn secondary" onclick={signOut} disabled={isLoading}
        >{$LL.auth.signOut()}</button
      >
    </div>
  {:else}
    <button class="auth-btn" onclick={() => (isPanelOpen = true)} disabled={isLoading}>
      {$LL.auth.signIn()}
    </button>
  {/if}

  {#if !authStore.isAuthenticated && isPanelOpen}
    <div
      use:portal
      class="modal-overlay"
      transition:fade={{ duration: 180 }}
      role="dialog"
      aria-modal="true"
      tabindex="0"
      onclick={(event) => {
        if (event.target === event.currentTarget) {
          closePanel();
        }
      }}
      onkeydown={handleDialogKeydown}
    >
      <div class="modal-container" transition:fly={{ y: 20, duration: 220 }}>
        <div class="modal-header">
          <h2 class="modal-title">
            <UserCircle size={20} weight="duotone" />
            {$LL.auth.signIn()}
          </h2>
          <button class="close-button" onclick={closePanel} aria-label={$LL.lyricSelector.close()}>
            <X size={20} />
          </button>
        </div>

        <div class="modal-content">
          <div class="panel-section">
            <p class="section-title">{$LL.auth.providersSection()}</p>
            <div class="provider-grid">
              {#each providers as provider (provider.id)}
                <button
                  class="provider-btn"
                  onclick={() => signInWithProvider(provider.id)}
                  disabled={isLoading}
                >
                  <span class="provider-icon">
                    <ProviderIcon provider={provider.id} size={20} />
                  </span>
                  {provider.label}
                </button>
              {/each}
            </div>
          </div>

          <div class="panel-section">
            <p class="section-title">{$LL.auth.emailSection()}</p>
            <form
              class="email-form"
              onsubmit={(event) => {
                event.preventDefault();
                submitEmailAuth();
              }}
            >
              {#if useSignUp}
                <input
                  type="text"
                  bind:value={name}
                  placeholder={$LL.auth.namePlaceholder()}
                  autocomplete="name"
                />
              {/if}
              <input
                type="email"
                bind:value={email}
                placeholder={$LL.auth.emailPlaceholder()}
                autocomplete="email"
                required
              />
              <input
                type="password"
                bind:value={password}
                placeholder={$LL.auth.passwordPlaceholder()}
                autocomplete={useSignUp ? 'new-password' : 'current-password'}
                required
              />
              <button class="submit-btn" type="submit" disabled={isLoading}>
                {useSignUp ? $LL.auth.createAccount() : $LL.auth.signInWithEmail()}
              </button>
            </form>

            <button
              class="switch-mode"
              onclick={() => (useSignUp = !useSignUp)}
              disabled={isLoading}
            >
              {useSignUp ? $LL.auth.alreadyHaveAccount() : $LL.auth.createNewAccount()}
            </button>

            {#if statusMessage}
              <p class="status">{statusMessage}</p>
            {/if}
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .auth-controls {
    position: relative;
  }

  .auth-btn {
    border: 1px solid var(--border-color);
    border-radius: 999px;
    background: var(--card-background);
    color: var(--text-color);
    padding: 0.4rem 0.8rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .auth-controls > .auth-btn {
    height: var(--top-control-height);
    box-sizing: border-box;
  }

  .auth-btn:hover:not(:disabled) {
    border-color: var(--primary-color);
    color: var(--primary-color);
  }

  .auth-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .auth-btn.secondary {
    font-weight: 500;
    border-radius: 999px;
  }

  .user-pill {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--card-background);
    border: 1px solid var(--border-color);
    border-radius: 999px;
    height: 40px;
    box-sizing: border-box;
    padding: 0.2rem 0.35rem 0.2rem 0.7rem;
    box-shadow: 0 2px 6px var(--shadow-color);
    max-width: min(50vw, 420px);
  }

  .user-name {
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
    background-color: rgba(10, 12, 18, 0.72);
    backdrop-filter: blur(4px);
    z-index: 9999;
  }

  .modal-container {
    width: min(100%, 520px);
    max-height: min(88vh, 760px);
    border-radius: 14px;
    border: 1px solid var(--border-color);
    background: var(--card-background);
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1rem 1.15rem;
    border-bottom: 1px solid var(--border-color);
  }

  .modal-title {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-color);
  }

  .close-button {
    border: none;
    background: rgba(var(--primary-color-rgb), 0.1);
    color: var(--text-color);
    border-radius: 999px;
    width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .close-button:hover {
    background: rgba(var(--primary-color-rgb), 0.18);
  }

  .modal-content {
    overflow-y: auto;
    padding: 1rem 1.15rem 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .panel-section {
    border: 1px solid var(--border-color);
    border-radius: 12px;
    padding: 0.85rem;
    background: rgba(var(--primary-color-rgb), 0.03);
  }

  .section-title {
    margin: 0 0 0.6rem;
    font-size: 0.74rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    opacity: 0.75;
  }

  .provider-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
  }

  .provider-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 10px;
    background: var(--card-background);
    color: var(--text-color);
    padding: 0.62rem 0.7rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;
  }

  .provider-btn:hover:not(:disabled) {
    border-color: var(--primary-color);
    background: rgba(var(--primary-color-rgb), 0.08);
  }

  .provider-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .provider-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .email-form {
    display: grid;
    gap: 0.5rem;
  }

  .email-form input {
    border: 1px solid var(--border-color);
    border-radius: 10px;
    padding: 0.62rem 0.7rem;
    background: var(--background-color);
    color: var(--text-color);
    font-size: 0.85rem;
  }

  .submit-btn {
    border: 1px solid rgba(var(--primary-color-rgb), 0.65);
    border-radius: 10px;
    background: linear-gradient(
      180deg,
      rgba(var(--primary-color-rgb), 0.92) 0%,
      rgba(var(--primary-color-rgb), 0.78) 100%
    );
    color: var(--on-primary-color);
    padding: 0.66rem 0.8rem;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
    transition: filter 0.2s ease;
  }

  .submit-btn:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .switch-mode {
    margin-top: 0.55rem;
    border: 0;
    background: transparent;
    color: var(--primary-color);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0;
    cursor: pointer;
  }

  .status {
    margin: 0.65rem 0 0;
    font-size: 0.76rem;
    color: #ef4444;
  }

  @media (max-width: 640px) {
    .modal-overlay {
      padding: 0;
    }

    .modal-container {
      width: 100%;
      max-height: 100%;
      height: 100%;
      border-radius: 0;
      border: none;
    }

    .modal-header {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--card-background);
      padding: 1rem;
    }

    .modal-content {
      padding: 0.9rem 1rem 1.2rem;
      flex: 1;
      -webkit-overflow-scrolling: touch;
    }

    .provider-grid {
      grid-template-columns: 1fr;
    }

    .panel-section {
      padding: 0.8rem;
    }

    .user-pill {
      max-width: 70vw;
    }
  }
</style>
