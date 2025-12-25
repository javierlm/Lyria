<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { playerState } from '$lib/features/player/stores/playerStore.svelte';
  import { handleLanguageChange as dispatchLangChange } from '$lib/features/player/services/playerActions';
  import CaretDown from 'phosphor-svelte/lib/CaretDown';
  import CloudSlash from 'phosphor-svelte/lib/CloudSlash';
  import { translationStore } from '$lib/features/settings/stores/translationStore.svelte';
  import LL from '$i18n/i18n-svelte';

  const languageFlags: { [key: string]: string } = {
    AR: 'sa', // Saudi Arabia
    BG: 'bg', // Bulgaria
    CS: 'cz', // Czech Republic
    DA: 'dk', // Denmark
    DE: 'de', // Germany
    EL: 'gr', // Greece
    EN: 'gb', // United Kingdom (generic English)
    'EN-GB': 'gb', // United Kingdom
    'EN-US': 'us', // United States
    ES: 'es', // Spain
    'ES-419': 'un', // United Nations (generic for Latin America)
    ET: 'ee', // Estonia
    FI: 'fi', // Finland
    FR: 'fr', // France
    HE: 'il', // Israel
    HU: 'hu', // Hungary
    ID: 'id', // Indonesia
    IT: 'it', // Italy
    JA: 'jp', // Japan
    KO: 'kr', // South Korea
    LT: 'lt', // Lithuania
    LV: 'lv', // Latvia
    NB: 'no', // Norway
    NL: 'nl', // Netherlands
    PL: 'pl', // Poland
    PT: 'pt', // Portugal (generic Portuguese)
    'PT-BR': 'br', // Brazil
    'PT-PT': 'pt', // Portugal
    RO: 'ro', // Romania
    RU: 'ru', // Russia
    SK: 'sk', // Slovakia
    SL: 'si', // Slovenia
    SV: 'se', // Sweden
    TH: 'th', // Thailand
    TR: 'tr', // Turkey
    UK: 'ua', // Ukraine
    VI: 'vn', // Vietnam
    ZH: 'cn', // China (generic Chinese)
    'ZH-HANS': 'cn', // China (simplified)
    'ZH-HANT': 'tw' // Taiwan (traditional)
  };

  const languages = $derived(
    Object.keys($LL.lyricsLanguages)
      .map((code) => ({
        code: code.toUpperCase(),
        name: $LL.lyricsLanguages[code as keyof typeof $LL.lyricsLanguages](),
        flagClass: languageFlags[code.toUpperCase()] || 'unknown' // Use a default class if not found
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  let dropdownOpen = $state(false);
  let maxDropdownWidth = $state(0); // State to store the maximum width

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
  <button class="select-button" onclick={() => (dropdownOpen = !dropdownOpen)}>
    <div class="selected-option">
      <span class="flag-icon {currentLang.flagClass}"></span>
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

  <div class="dropdown" class:open={dropdownOpen}>
    {#each languages as lang (lang.code)}
      <button
        class="dropdown-option"
        class:selected={lang.code === selectedLanguage}
        onclick={() => selectLanguage(lang.code)}
      >
        <span class="flag-icon {lang.flagClass}"></span>
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

  /* Example flag styles - User needs to provide actual flag images or a sprite */
  .flag-icon.us {
    background-image: url('https://flagcdn.com/us.svg'); /* Placeholder */
  }
  .flag-icon.gb {
    background-image: url('https://flagcdn.com/gb.svg'); /* Placeholder */
  }
  .flag-icon.es {
    background-image: url('https://flagcdn.com/es.svg'); /* Placeholder */
  }
  .flag-icon.fr {
    background-image: url('https://flagcdn.com/fr.svg'); /* Placeholder */
  }
  .flag-icon.de {
    background-image: url('https://flagcdn.com/de.svg'); /* Placeholder */
  }
  .flag-icon.jp {
    background-image: url('https://flagcdn.com/jp.svg'); /* Placeholder */
  }
  .flag-icon.cn {
    background-image: url('https://flagcdn.com/cn.svg'); /* Placeholder */
  }
  .flag-icon.tw {
    background-image: url('https://flagcdn.com/tw.svg'); /* Placeholder */
  }
  .flag-icon.br {
    background-image: url('https://flagcdn.com/br.svg'); /* Placeholder */
  }
  .flag-icon.pt {
    background-image: url('https://flagcdn.com/pt.svg'); /* Placeholder */
  }
  .flag-icon.it {
    background-image: url('https://flagcdn.com/it.svg'); /* Placeholder */
  }
  .flag-icon.ru {
    background-image: url('https://flagcdn.com/ru.svg'); /* Placeholder */
  }
  .flag-icon.kr {
    background-image: url('https://flagcdn.com/kr.svg'); /* Placeholder */
  }
  .flag-icon.sa {
    background-image: url('https://flagcdn.com/sa.svg'); /* Placeholder */
  }
  .flag-icon.bg {
    background-image: url('https://flagcdn.com/bg.svg'); /* Placeholder */
  }
  .flag-icon.cz {
    background-image: url('https://flagcdn.com/cz.svg'); /* Placeholder */
  }
  .flag-icon.dk {
    background-image: url('https://flagcdn.com/dk.svg'); /* Placeholder */
  }
  .flag-icon.gr {
    background-image: url('https://flagcdn.com/gr.svg'); /* Placeholder */
  }
  .flag-icon.ee {
    background-image: url('https://flagcdn.com/ee.svg'); /* Placeholder */
  }
  .flag-icon.fi {
    background-image: url('https://flagcdn.com/fi.svg'); /* Placeholder */
  }
  .flag-icon.il {
    background-image: url('https://flagcdn.com/il.svg'); /* Placeholder */
  }
  .flag-icon.hu {
    background-image: url('https://flagcdn.com/hu.svg'); /* Placeholder */
  }
  .flag-icon.id {
    background-image: url('https://flagcdn.com/id.svg'); /* Placeholder */
  }
  .flag-icon.lt {
    background-image: url('https://flagcdn.com/lt.svg'); /* Placeholder */
  }
  .flag-icon.lv {
    background-image: url('https://flagcdn.com/lv.svg'); /* Placeholder */
  }
  .flag-icon.no {
    background-image: url('https://flagcdn.com/no.svg'); /* Placeholder */
  }
  .flag-icon.nl {
    background-image: url('https://flagcdn.com/nl.svg'); /* Placeholder */
  }
  .flag-icon.pl {
    background-image: url('https://flagcdn.com/pl.svg'); /* Placeholder */
  }
  .flag-icon.ro {
    background-image: url('https://flagcdn.com/ro.svg'); /* Placeholder */
  }
  .flag-icon.sk {
    background-image: url('https://flagcdn.com/sk.svg'); /* Placeholder */
  }
  .flag-icon.si {
    background-image: url('https://flagcdn.com/si.svg'); /* Placeholder */
  }
  .flag-icon.se {
    background-image: url('https://flagcdn.com/se.svg'); /* Placeholder */
  }
  .flag-icon.th {
    background-image: url('https://flagcdn.com/th.svg'); /* Placeholder */
  }
  .flag-icon.tr {
    background-image: url('https://flagcdn.com/tr.svg'); /* Placeholder */
  }
  .flag-icon.ua {
    background-image: url('https://flagcdn.com/ua.svg'); /* Placeholder */
  }
  .flag-icon.vn {
    background-image: url('https://flagcdn.com/vn.svg'); /* Placeholder */
  }
  .flag-icon.un {
    background-image: url('https://flagcdn.com/un.svg'); /* Placeholder for generic UN flag */
  }
  .flag-icon.unknown {
    background-image: url('https://flagcdn.com/unknown.svg'); /* Placeholder for unknown flag */
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
    z-index: 10;
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
  }
</style>
