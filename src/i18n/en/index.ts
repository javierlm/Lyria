import type { Translation } from '../i18n-types';

const en = {
	appName: 'Lyria',
	// Search
	search: {
		placeholder: 'Search by artist, song, or YouTube URL',
		loadVideo: 'Load Video',
		notInHistory: 'This video is not in your history',
		pressEnterToLoad: 'Press Enter to load it',
		noResults: 'No results found',
		searchHint: 'Try searching by artist, song, or paste a YouTube URL',
		all: 'All',
		favorites: 'Favorites'
	},
	video: {
		unplayed: 'Unplayed'
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
		showTranslated: 'Show translated subtitles'
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
		loading: 'Loading...'
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
	pwa: {
		newVersionAvailable: 'New version available',
		reload: 'Reload',
		close: 'Close'
	}
} satisfies Translation;

export default en;
