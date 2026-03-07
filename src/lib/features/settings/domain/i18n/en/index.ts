import type { Translation } from '../i18n-types';

const en = {
  appName: 'Lyria',
  // Search
  search: {
    placeholder: 'Search by artist or song, or paste a YouTube URL',
    loadVideo: 'Load Video',
    loadMoreResults: 'Load more results',
    loadingMoreResults: 'Loading...',
    loadMoreErrorTitle: 'Could not load more results',
    loadMoreErrorMessage: 'Please try again in a few seconds',
    alsoInterested: 'You might also like',
    notInHistory: 'This video is not in your history',
    pressEnterToLoad: 'Press Enter to load it',
    noResults: 'No results found',
    searchHint: 'Try searching by artist or song, or paste a YouTube URL',
    all: 'All',
    favorites: 'Favorites'
  },
  video: {
    unplayed: 'Unplayed',
    globalResult: 'Global result'
  },
  videoError: {
    title: 'Video Unavailable',
    invalidId: 'This video ID is invalid.',
    notFound: 'This video was not found or has been removed.',
    notPlayable: 'This video cannot be played here.',
    genericError: 'An error occurred while loading the video.',
    goBack: 'Go Back'
  },
  // Lyrics
  lyrics: {
    original: 'Original Lyrics',
    translated: 'Translated Lyrics',
    loading: 'Lyrics on their way! Just a little wait!... ✍️',
    notFound: 'No lyrics found for this song',
    hideOriginal: 'Hide original subtitles',
    showOriginal: 'Show original subtitles',
    hideTranslated: 'Hide translated subtitles',
    showTranslated: 'Show translated subtitles',
    hideTransliteration: 'Hide transliteration',
    showTransliteration: 'Show transliteration'
  },
  lyricSelector: {
    title: 'Select Lyrics',
    automatic: 'Automatic Selection',
    automaticDescription: 'Let the app choose',
    noLyrics: 'No lyrics found',
    synced: 'Synced',
    plain: 'Plain',
    close: 'Close',
    searchPlaceholder: 'Search for lyrics...',
    searching: 'Searching...',
    searchHint: 'Type a song or artist name to search'
  },
  // Video Controls
  controls: {
    original: 'Original',
    translated: 'Translated',
    copyUrl: 'Copy URL',
    syncWithCurrentTime: 'Sync with current time',
    deleteVideo: 'Delete video',
    play: 'Play',
    pause: 'Pause',
    mute: 'Mute',
    unmute: 'Unmute',
    enterFullscreen: 'Enter fullscreen',
    exitFullscreen: 'Exit fullscreen',
    decreaseTimingOffset: 'Decrease timing offset',
    increaseTimingOffset: 'Increase timing offset',
    clickToStart: 'Click to start',
    loading: 'Loading...',
    selectLyrics: 'Select Lyrics',
    enterHorizontalMode: 'Enter horizontal mode',
    exitHorizontalMode: 'Exit horizontal mode'
  },
  // Footer
  footer: {
    github: 'View on GitHub',
    license: 'Released under the {license} License',
    author: 'Created with passion by {author}',
    mit: 'MIT',
    authorName: 'Javier López Medina'
  },
  languages: {
    en: 'English',
    es: 'Spanish'
  },
  lyricsLanguages: {
    AR: 'Arabic',
    BG: 'Bulgarian',
    CS: 'Czech',
    DA: 'Danish',
    DE: 'German',
    EL: 'Greek',
    'EN-GB': 'English (British)',
    'EN-US': 'English (American)',
    ES: 'Spanish',
    'ES-419': 'Spanish (Latin American)',
    ET: 'Estonian',
    FI: 'Finnish',
    FR: 'French',
    HE: 'Hebrew',
    HU: 'Hungarian',
    ID: 'Indonesian',
    IT: 'Italian',
    JA: 'Japanese',
    KO: 'Korean',
    LT: 'Lithuanian',
    LV: 'Latvian',
    NB: 'Norwegian Bokmål',
    NL: 'Dutch',
    PL: 'Polish',
    'PT-BR': 'Portuguese (Brazilian)',
    'PT-PT': 'Portuguese (Portugal)',
    RO: 'Romanian',
    RU: 'Russian',
    SK: 'Slovak',
    SL: 'Slovenian',
    SV: 'Swedish',
    TH: 'Thai',
    TR: 'Turkish',
    UK: 'Ukrainian',
    VI: 'Vietnamese',
    ZH: 'Chinese',
    'ZH-HANS': 'Chinese (simplified)',
    'ZH-HANT': 'Chinese (traditional)'
  },
  time: {
    secondsAgo: '{0} second{{s}} ago',
    minutesAgo: '{0} minute{{s}} ago',
    hoursAgo: '{0} hour{{s}} ago',
    daysAgo: '{0} day{{s}} ago',
    weeksAgo: '{0} week{{s}} ago',
    monthsAgo: '{0} month{{s}} ago',
    yearsAgo: '{0} year{{s}} ago'
  },
  loadingPhrases: [
    '🎵 Loading your jam...',
    '🎸 Tuning the air guitar...',
    '🎤 Warming up the vocal cords...',
    '🔑 Finding the right key...',
    '✨ Polishing the microphone...',
    '🥁 Syncing with the rhythm...',
    '😴 Asking the drummer to wake up...',
    '🔓 Unlocking the groove...',
    '💾 Loading data... or at least pretending to.',
    '🧮 Calculating the exact number of nanoseconds you will wait.',
    '⏳ Almost there... (but not quite).',
    '💬 Loading the message that says “Loading…”.',
    '🎡 Simulating progress to keep you entertained.',
    '🎤 Looking for the lyrics… seems the singer doesn’t know them either.',
    '🎧 Convincing the DJ to press play...',
    '🎼 Rehearsing the chorus one last time...',
    '🕺 Practicing dance moves while you wait...',
    '🐢 Loading at the speed of a ballad...',
    '🎹 Tuning the piano keys...',
    '📢 Testing the speakers: One, two, three...'
  ],
  theme: {
    toggle: 'Toggle theme',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    current: 'Current theme: {0}'
  },
  chromeAI: {
    useBrowserAI: 'Local translation',
    beta: 'Beta',
    downloading: 'Downloading...',
    modelReady: 'Ready',
    modelError: 'Error',
    localTranslationTooltip: 'Translated locally (offline)',
    downloadableTooltip: 'Available for local translation (requires download)',
    disclaimer:
      'Some languages may not be available. Cloud translation will be used as fallback. Local translations may be less accurate.'
  },
  pwa: {
    newVersionAvailable: 'New version available',
    reload: 'Reload',
    close: 'Close'
  },
  demoMode: {
    title: 'Demo Mode',
    toggle: 'Toggle demo mode',
    badge: 'Demo',
    description: 'Try the app with pre-loaded demo videos'
  },
  auth: {
    account: 'Account',
    signIn: 'Sign in',
    signOut: 'Sign out',
    providersSection: 'Providers',
    providers: {
      google: 'Google',
      microsoft: 'Microsoft',
      spotify: 'Spotify'
    },
    emailSection: 'Email and password',
    namePlaceholder: 'Name',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    createAccount: 'Create account',
    signInWithEmail: 'Sign in',
    createNewAccount: 'Create a new account',
    alreadyHaveAccount: 'I already have an account',
    errors: {
      signInFailed: 'Could not sign in.',
      signOutFailed: 'Could not sign out.',
      authFailed: 'Could not complete authentication.',
      emailPasswordRequired: 'Email and password are required.',
      nameRequired: 'Name is required to sign up.'
    }
  },
  meta: {
    description: 'Watch on Lyria'
  },
  songOfTheDay: {
    label: 'On this day in {year}'
  },
  notifications: {
    close: 'Close notification',
    horizontalModeAutoActivated: 'Horizontal mode activated',
    unsyncedLyricsHorizontalMode:
      'The lyrics for this song are not synced. Horizontal mode has been automatically activated to make reading easier.',
    lyricVideoDetected: 'Lyrics video detected',
    lyricVideoDetectedMessage:
      'This video probably already includes lyrics on screen, so the original synced subtitles have been hidden automatically.',
    translationFailed: 'Translation failed',
    translationFailedMessage: 'Could not translate the lyrics. Please try again later.',
    addedToFavorites: 'Added to favorites',
    removedFromFavorites: 'Removed from favorites',
    favoriteLimitReached: 'Favorites limit reached',
    favoriteLimitReachedMessage:
      'You can save up to 500 favorite videos. Remove one to add another.',
    favoriteError: 'Could not update favorites',
    favoriteErrorMessage: 'Please try again later.',
    recentDeleteError: 'Could not remove from recents',
    recentDeleteErrorMessage: 'Please try again later.',
    urlCopied: 'URL copied',
    urlCopyError: 'Could not copy URL',
    urlCopyErrorMessage: 'Please try copying the link manually.',
    signedIn: 'Session started',
    signedInMessage: 'You are now signed in.',
    importFromDevice: 'Import your local videos?',
    importFromDeviceMessage:
      'We found videos stored in this browser. Import missing recents and favorites into your account?',
    importNow: 'Import',
    importLater: 'Not now',
    importInProgress: 'Importing videos',
    importInProgressMessage: 'Please wait while we import your local recents and favorites.',
    importCompleted: 'Import completed',
    importCompletedMessage: 'Your missing local recents and favorites were imported successfully.',
    importPartial: 'Import completed with warnings',
    importPartialMessage:
      'Some videos could not be imported right now. You can continue using the app and try again later.',
    demoModeActivated: 'Demo mode activated',
    demoModeActivatedMessage:
      'Demo videos are now available. To exit demo mode, open the menu and select "Disable demo mode".',
    transliterationAvailable: 'Transliteration available',
    transliterationAvailableMessage: 'This song is in {language}. Enable transliteration?',
    transliterationActivate: 'Enable',
    transliterationLater: 'Not now',
    transliterationLanguages: {
      ja: 'Japanese',
      zh: 'Chinese',
      ko: 'Korean',
      el: 'Greek',
      ru: 'Russian',
      ar: 'Arabic',
      he: 'Hebrew',
      th: 'Thai'
    }
  }
} satisfies Translation;

export default en;
