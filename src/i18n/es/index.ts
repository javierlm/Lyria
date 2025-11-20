import type { Translation } from '../i18n-types';

const es = {
	appName: 'Lyria',
	// Search
	search: {
		placeholder: 'Introduce la URL de YouTube',
		loadVideo: 'Cargar Video'
	},
	// Lyrics
	lyrics: {
		original: 'Letra Original',
		translated: 'Letra Traducida',
		loading: '¡Las letras están en camino! Solo un poco de espera... ✍️',
		notFound: 'No se encontraron letras para esta canción',
		hideOriginal: 'Ocultar subtítulos originales',
		showOriginal: 'Mostrar subtítulos originales',
		hideTranslated: 'Ocultar subtítulos traducidos',
		showTranslated: 'Mostrar subtítulos traducidos'
	},
	// Video Controls
	controls: {
		original: 'Original',
		translated: 'Traducido',
		copyUrl: 'Copiar URL',
		syncWithCurrentTime: 'Sincronizar con el tiempo actual',
		deleteVideo: 'Eliminar video',
		play: 'Reproducir',
		pause: 'Pausar',
		mute: 'Silenciar',
		unmute: 'Activar sonido',
		enterFullscreen: 'Pantalla completa',
		exitFullscreen: 'Salir de pantalla completa',
		decreaseTimingOffset: 'Disminuir desfase de tiempo',
		increaseTimingOffset: 'Aumentar desfase de tiempo'
	},
	// Footer
	footer: {
		github: 'Ver en GitHub',
		license: 'Publicado bajo la licencia {license}',
		author: 'Creado con pasión por {author}',
		mit: 'MIT',
		authorName: 'Javier López Medina'
	},
	languages: {
		en: 'Inglés',
		es: 'Español'
	},
	lyricsLanguages: {
		AR: 'Árabe',
		BG: 'Búlgaro',
		CS: 'Checo',
		DA: 'Danés',
		DE: 'Alemán',
		EL: 'Griego',
		'EN-GB': 'Inglés (británico)',
		'EN-US': 'Inglés (americano)',
		ES: 'Español',
		'ES-419': 'Español (latinoamericano)',
		ET: 'Estonio',
		FI: 'Finlandés',
		FR: 'Francés',
		HE: 'Hebreo',
		HU: 'Húngaro',
		ID: 'Indonesio',
		IT: 'Italiano',
		JA: 'Japonés',
		KO: 'Coreano',
		LT: 'Lituano',
		LV: 'Letón',
		NB: 'Noruego Bokmål',
		NL: 'Holandés',
		PL: 'Polaco',
		'PT-BR': 'Portugués (brasileño)',
		'PT-PT': 'Portugués (Portugal)',
		RO: 'Rumano',
		RU: 'Ruso',
		SK: 'Eslovaco',
		SL: 'Esloveno',
		SV: 'Sueco',
		TH: 'Tailandés',
		TR: 'Turco',
		UK: 'Ucraniano',
		VI: 'Vietnamita',
		ZH: 'Chino',
		'ZH-HANS': 'Chino (simplificado)',
		'ZH-HANT': 'Chino (tradicional)'
	},
	time: {
		secondsAgo: 'hace {0} segundo{{s}}',
		minutesAgo: 'hace {0} minuto{{s}}',
		hoursAgo: 'hace {0} hora{{s}}',
		daysAgo: 'hace {0} día{{s}}',
		weeksAgo: 'hace {0} semana{{s}}',
		monthsAgo: 'hace {0} mes{{es}}',
		yearsAgo: 'hace {0} año{{s}}'
	}
} satisfies Translation;

export default es;
