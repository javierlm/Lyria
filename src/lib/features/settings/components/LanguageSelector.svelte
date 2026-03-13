<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { handleLanguageChange as dispatchLangChange } from '$lib/features/player/services/playerActions';
  import CaretDown from 'phosphor-svelte/lib/CaretDown';
  import CloudSlash from 'phosphor-svelte/lib/CloudSlash';
  import { translationStore } from '$lib/features/settings/stores/translationStore.svelte';
  import { getLanguageFlagUrl } from '$lib/shared/languageMetadata';
  import LL from '$i18n/i18n-svelte';

  const languages = $derived(
    Object.keys($LL.lyricsLanguages)
      .map((code) => ({
        code: code.toUpperCase(),
        name: $LL.lyricsLanguages[code as keyof typeof $LL.lyricsLanguages](),
        flagUrl: getLanguageFlagUrl(code)
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  let dropdownOpen = $state(false);
  let maxDropdownWidth = $state(0); // State to store the maximum width
  let openUpwards = $state(false); // State to track if dropdown should open upwards
  let selectButtonRef: HTMLButtonElement | null = null;

  const selectedLanguage = $derived(playerState.userLang.toUpperCase());
  const currentLang = $derived(
    languages.find((l) => l.code === selectedLanguage) ||
      languages.find((l) => l.code === 'EN-US') ||
      languages[0]
  );

  let languageStatus: Record<string, 'readily' | 'after-download' | 'no'> = $state({});

  $effect(() => {
    const sourceLang = playerState.detectedSourceLanguage || 'en';
    const isSupported = translationStore.isChromeAISupported && translationStore.useChromeAI;

    if (!isSupported) {
      languageStatus = {};
      return;
    }

    // Check all languages in parallel and update state
    (async () => {
      const newStatus: Record<string, 'readily' | 'after-download' | 'no'> = {};

      const results = await Promise.all(
        languages.map(async (lang) => {
          const status = await translationStore.checkLanguagePairAvailability(
            sourceLang,
            lang.code
          );
          return { code: lang.code, status };
        })
      );

      for (const { code, status } of results) {
        if (status !== 'no') {
          newStatus[code] = status;
        }
      }

      languageStatus = newStatus;
    })();
  });

  // Function to toggle dropdown with position detection
  function toggleDropdown() {
    if (!dropdownOpen && selectButtonRef) {
      const buttonRect = selectButtonRef.getBoundingClientRect();
      // Use 250px for mobile (≤768px), 400px for desktop
      const dropdownHeight = window.innerWidth <= 768 ? 250 : 400;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;

      // Open upwards if there's not enough space below but enough space above
      openUpwards = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
    }
    dropdownOpen = !dropdownOpen;
  }

  // Function to handle language selection
  function selectLanguage(code: string) {
    dispatchLangChange(code.toLowerCase()); // Dispatch the action to update the store, convert back to lowercase if store expects it
    dropdownOpen = false; // Close dropdown after selection
  }

  // Handle click outside to close dropdown
  function handleClickOutside(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (dropdownOpen && !target.closest('.select-wrapper')) {
      dropdownOpen = false;
    }
  }

  onMount(() => {
    // Load saved theme on mount
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    document.addEventListener('click', handleClickOutside);

    // Calculate max width for dropdown options
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.fontSize = '11px'; // Match dropdown-option font-size
    tempSpan.style.fontWeight = '500'; // Match dropdown-option font-weight
    document.body.appendChild(tempSpan);

    let maxWidth = 0;
    for (const lang of languages) {
      tempSpan.textContent = lang.name;
      const textWidth = tempSpan.offsetWidth;
      // Add padding, flag icon width, and gap to the text width
      // padding: 10px 15px (left/right padding) = 30px
      // flag-icon width: 22px
      // gap: 8px
      // Total extra width = 30px + 22px + 8px = 60px
      maxWidth = Math.max(maxWidth, textWidth + 60);
    }
    maxDropdownWidth = maxWidth;
    document.body.removeChild(tempSpan);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside);
  });
</script>

<div
  class="select-wrapper"
  style="--max-dropdown-width: {maxDropdownWidth ? `${maxDropdownWidth}px` : 'auto'};"
>
  <button class="select-button" bind:this={selectButtonRef} onclick={toggleDropdown}>
    <div class="selected-option">
      <span
        class="flag-icon"
        class:no-flag={!currentLang.flagUrl}
        style:background-image={currentLang.flagUrl ? `url('${currentLang.flagUrl}')` : 'none'}
      ></span>
      <span>{currentLang.name}</span>
      {#if translationStore.isChromeAISupported && translationStore.useChromeAI && languageStatus[currentLang.code]}
        <div
          class="local-badge"
          class:ready={languageStatus[currentLang.code] === 'readily'}
          class:download={languageStatus[currentLang.code] === 'after-download'}
          title={languageStatus[currentLang.code] === 'readily'
            ? $LL.chromeAI.localTranslationTooltip()
            : $LL.chromeAI.downloadableTooltip()}
        >
          <CloudSlash size={12} weight="bold" />
        </div>
      {/if}
    </div>
    <CaretDown weight="bold" class={dropdownOpen ? 'rotatecaret' : ''} style="margin-left: auto;" />
  </button>

  <div class="dropdown" class:open={dropdownOpen} class:open-upwards={openUpwards}>
    {#each languages as lang (lang.code)}
      <button
        class="dropdown-option"
        class:selected={lang.code === selectedLanguage}
        onclick={() => selectLanguage(lang.code)}
      >
        <span
          class="flag-icon"
          class:no-flag={!lang.flagUrl}
          style:background-image={lang.flagUrl ? `url('${lang.flagUrl}')` : 'none'}
        ></span>
        <div class="lang-text-wrapper">
          <span>{lang.name}</span>
          {#if translationStore.isChromeAISupported && translationStore.useChromeAI && languageStatus[lang.code]}
            <div
              class="local-badge"
              class:ready={languageStatus[lang.code] === 'readily'}
              class:download={languageStatus[lang.code] === 'after-download'}
              title={languageStatus[lang.code] === 'readily'
                ? $LL.chromeAI.localTranslationTooltip()
                : $LL.chromeAI.downloadableTooltip()}
            >
              <CloudSlash size={12} weight="bold" />
            </div>
          {/if}
        </div>
        {#if lang.code === selectedLanguage}
          <svg class="checkmark" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            ></path>
          </svg>
        {/if}
      </button>
    {/each}
  </div>
</div>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  .lang-text-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .local-badge {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    border-radius: 4px;
    line-height: 1;
  }

  .selected-option .local-badge {
    background: transparent;
    padding: 0;
  }

  .selected-option .local-badge.ready,
  .selected-option .local-badge.download {
    color: #fff;
  }

  .dropdown-option .local-badge.ready {
    background: rgba(34, 197, 94, 0.9);
    color: #fff;
  }

  .dropdown-option .local-badge.download {
    background: rgba(59, 130, 246, 0.9);
    color: #fff;
  }

  :global(body.dark-mode) {
    background: linear-gradient(
      135deg,
      #1a1a1a 0%,
      #2d1a1a 25%,
      #3d1a1a 50%,
      #4a1a1a 75%,
      #5a1a1a 100%
    );
  }

  .select-button :global(svg) {
    transition: transform 0.3s ease;
  }

  .select-button :global(svg.rotatecaret) {
    transform: rotate(180deg);
  }

  .select-wrapper {
    position: relative;
  }

  .select-button {
    width: 100%;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: var(--on-primary-color);
    border: none;
    border-radius: 5px;
    padding: 10px 15px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    font-size: 0.8rem;
    transition: all 0.3s ease;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    height: 42px;
  }

  :global(body.dark-mode) .select-button {
    box-shadow:
      0 8px 20px rgba(239, 68, 68, 0.5),
      0 0 25px rgba(220, 38, 38, 0.3);
  }

  .select-button:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--primary-color-hover), var(--secondary-color));
  }

  .select-button:active {
    transform: translateY(0);
  }

  .selected-option {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    flex-grow: 1;
  }

  .flag-icon {
    width: 22px;
    height: 16px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: 1px solid #ccc;
    display: inline-block;
    vertical-align: middle;
  }

  .flag-icon.no-flag {
    background-image: none;
    background-color: rgba(var(--primary-color-rgb), 0.15);
    border-color: rgba(var(--primary-color-rgb), 0.25);
  }

  .chevron {
    width: 20px;
    height: 20px;
    transition: transform 0.3s ease;
  }

  .chevron.open {
    transform: rotate(180deg);
  }

  .dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: var(--card-background);
    border-radius: 16px;
    box-shadow: 0 20px 60px var(--darker-shadow-color);
    border: 1px solid var(--border-color);
    overflow: hidden;
    z-index: 1000;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.2s ease;
    max-height: 400px;
    overflow-y: auto;
  }

  .dropdown.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }

  .dropdown.open-upwards {
    top: auto;
    bottom: calc(100% + 8px);
    transform: translateY(10px);
  }

  .dropdown.open-upwards.open {
    transform: translateY(0);
  }

  .dropdown-option {
    width: 100%;
    padding: 10px 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: none;
    background: var(--card-background);
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-color);
    border-left: 3px solid transparent;
  }

  .dropdown-option:hover {
    background: rgba(var(--primary-color-rgb), 0.1);
  }

  .dropdown-option.selected {
    background: linear-gradient(
      90deg,
      rgba(var(--primary-color-rgb), 0.1) 0%,
      rgba(var(--primary-color-rgb), 0.2) 100%
    );
    border-left-color: var(--primary-color);
    color: var(--primary-color);
  }

  .checkmark {
    width: 16px;
    height: 16px;
    margin-left: auto;
    color: var(--primary-color);
  }

  .dropdown {
    scrollbar-width: thin;
    scrollbar-color: var(--primary-color) rgba(var(--primary-color-rgb), 0.1);
  }

  .dropdown::-webkit-scrollbar {
    width: 8px;
  }

  .dropdown::-webkit-scrollbar-track {
    background: rgba(var(--primary-color-rgb), 0.1);
  }

  .dropdown::-webkit-scrollbar-thumb {
    background: var(--primary-color);
    border-radius: 4px;
  }

  .dropdown::-webkit-scrollbar-thumb:hover {
    background: var(--primary-color-hover);
  }

  .theme-toggle {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
    border: none;
    border-radius: 50%;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
    transition: all 0.3s ease;
    z-index: 100;
  }

  .theme-toggle:active {
    transform: scale(1.05);
  }

  :global(body.dark-mode) .theme-toggle {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    box-shadow:
      0 4px 12px rgba(239, 68, 68, 0.5),
      0 0 20px rgba(220, 38, 38, 0.3);
  }

  @media (max-width: 768px) {
    .select-wrapper {
      width: 140px;
    }

    .dropdown {
      max-height: 250px;
    }
  }
</style>
