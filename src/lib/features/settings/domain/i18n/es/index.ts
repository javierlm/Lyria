import type { Translation } from '../i18n-types';

const es = {
	appName: 'Lyria',
	// Search
	search: {
		placeholder: 'Busca por artista, canción o URL de YouTube',
		loadVideo: 'Cargar Video',
		notInHistory: 'Este video no está en tu historial',
		pressEnterToLoad: 'Presiona Enter para cargarlo',
		noResults: 'No se encontraron resultados',
		searchHint: 'Intenta buscar por artista, canción o pega una URL de YouTube',
		all: 'Todos',
		favorites: 'Favoritos'
	},
	video: {
		unplayed: 'Sin reproducir'
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
		increaseTimingOffset: 'Aumentar desfase de tiempo',
		clickToStart: 'Haz clic para empezar',
		loading: 'Cargando...'
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
	},
	loadingPhrases: [
		'🎵 Cargando tu temazo...',
		'🎸 Afinando la guitarra invisible...',
		'🎤 Calentando las cuerdas vocales...',
		'🔑 Buscando el tono perfecto...',
		'✨ Sacando brillo al micrófono...',
		'🥁 Sincronizando con el ritmo...',
		'😴 Despertando al batería...',
		'🔓 Desbloqueando el groove...',
		'💾 Cargando datos... o al menos fingiendo hacerlo.',
		'🧮 Calculando el número exacto de nanosegundos que vas a esperar.',
		'⏳ Casi, casi... (pero aún no).',
		'💬 Cargando el mensaje que dice “Cargando…”.',
		'🎡 Simulando progreso para mantenerte entretenido.',
		'🎤 Buscando la letra... parece que el cantante aún no se la sabe.',
		'🎧 Convenciendo al DJ para que le dé al play...',
		'🎼 Ensayando el estribillo una última vez...',
		'🕺 Practicando pasos de baile mientras esperas...',
		'🐢 Cargando a la velocidad de una balada...',
		'🎹 Afinando las teclas del piano...',
		'📢 Probando los altavoces: Uno, dos, tres...'
	],
	theme: {
		toggle: 'Cambiar tema',
		light: 'Claro',
		dark: 'Oscuro',
		system: 'Sistema',
		current: 'Tema actual: {0}'
	},
	chromeAI: {
		useBrowserAI: 'Traducción local',
		beta: 'Beta',
		downloading: 'Descargando...',
		modelReady: 'Listo',
		modelError: 'Error',
		localTranslationTooltip: 'Traducido localmente (sin conexión)',
		downloadableTooltip: 'Disponible para traducción local (requiere descarga)',
		disclaimer:
			'Algunos idiomas podrían no estar disponibles. Se usará traducción en la nube como alternativa. Las traducciones locales podrían ser menos precisas.'
	},
	pwa: {
		newVersionAvailable: 'Nueva versión disponible',
		reload: 'Recargar',
		close: 'Cerrar'
	}
} satisfies Translation;

export default es;
