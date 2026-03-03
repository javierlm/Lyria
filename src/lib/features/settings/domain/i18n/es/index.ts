import type { Translation } from '../i18n-types';

const es = {
  appName: 'Lyria',
  // Search
  search: {
    placeholder: 'Busca por artista o canción, o pega una URL de YouTube',
    loadVideo: 'Cargar Video',
    loadMoreResults: 'Cargar mas resultados',
    loadingMoreResults: 'Cargando...',
    loadMoreErrorTitle: 'No se pudieron cargar mas resultados',
    loadMoreErrorMessage: 'Intentalo de nuevo en unos segundos',
    alsoInterested: 'Tambien te puede interesar',
    notInHistory: 'Este video no está en tu historial',
    pressEnterToLoad: 'Presiona Enter para cargarlo',
    noResults: 'No se encontraron resultados',
    searchHint: 'Intenta buscar por artista o canción, o pega una URL de YouTube',
    all: 'Todos',
    favorites: 'Favoritos'
  },
  video: {
    unplayed: 'Sin reproducir',
    globalResult: 'Resultado global'
  },
  videoError: {
    title: 'Vídeo no disponible',
    invalidId: 'Este ID de vídeo no es válido.',
    notFound: 'Este vídeo no se encontró o ha sido eliminado.',
    notPlayable: 'Este vídeo no se puede reproducir aquí.',
    genericError: 'Ocurrió un error al cargar el vídeo.',
    goBack: 'Volver'
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
    showTranslated: 'Mostrar subtítulos traducidos',
    hideTransliteration: 'Ocultar transliteración',
    showTransliteration: 'Mostrar transliteración'
  },
  lyricSelector: {
    title: 'Seleccionar Letra',
    automatic: 'Selección Automática',
    automaticDescription: 'Deja que la app elija',
    noLyrics: 'No se encontraron letras',
    synced: 'Sincronizada',
    plain: 'Sin sincronizar',
    close: 'Cerrar',
    searchPlaceholder: 'Buscar letras...',
    searching: 'Buscando...',
    searchHint: 'Escribe el nombre de la canción o el artista para buscar'
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
    loading: 'Cargando...',
    selectLyrics: 'Seleccionar Letra',
    enterHorizontalMode: 'Entrar al modo horizontal',
    exitHorizontalMode: 'Salir del modo horizontal'
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
  },
  demoMode: {
    title: 'Modo Demo',
    toggle: 'Activar modo demo',
    badge: 'Demo',
    description: 'Prueba la app con videos de demo precargados'
  },
  auth: {
    account: 'Cuenta',
    signIn: 'Iniciar sesion',
    signOut: 'Cerrar sesion',
    providersSection: 'Proveedores',
    providers: {
      google: 'Google',
      microsoft: 'Microsoft',
      spotify: 'Spotify'
    },
    emailSection: 'Email y password',
    namePlaceholder: 'Nombre',
    emailPlaceholder: 'Email',
    passwordPlaceholder: 'Password',
    createAccount: 'Crear cuenta',
    signInWithEmail: 'Iniciar sesión',
    createNewAccount: 'Crear cuenta nueva',
    alreadyHaveAccount: 'Ya tengo cuenta',
    errors: {
      signInFailed: 'No se pudo iniciar sesion.',
      signOutFailed: 'No se pudo cerrar sesion.',
      authFailed: 'No se pudo completar la autenticacion.',
      emailPasswordRequired: 'Email y password son obligatorios.',
      nameRequired: 'El nombre es obligatorio para registrarte.'
    }
  },
  meta: {
    description: 'Ver en Lyria'
  },
  songOfTheDay: {
    label: 'Tal día como hoy en {year}'
  },
  notifications: {
    close: 'Cerrar notificación',
    horizontalModeAutoActivated: 'Modo horizontal activado',
    unsyncedLyricsHorizontalMode:
      'La letra de esta canción no está sincronizada. Se ha activado automáticamente el modo horizontal para facilitar su lectura.',
    translationFailed: 'Error en la traducción',
    translationFailedMessage: 'No se pudieron traducir las letras. Inténtalo más tarde.',
    addedToFavorites: 'Añadido a favoritos',
    removedFromFavorites: 'Eliminado de favoritos',
    favoriteError: 'No se pudo actualizar favoritos',
    favoriteErrorMessage: 'Inténtalo de nuevo más tarde.',
    recentDeleteError: 'No se pudo quitar de recientes',
    recentDeleteErrorMessage: 'Inténtalo de nuevo más tarde.',
    urlCopied: 'URL copiada',
    urlCopyError: 'No se pudo copiar la URL',
    urlCopyErrorMessage: 'Copia el enlace manualmente.',
    signedIn: 'Sesion iniciada',
    signedInMessage: 'Has iniciado sesion correctamente.',
    importFromDevice: 'Importar videos locales?',
    importFromDeviceMessage:
      'Hemos encontrado videos guardados en este navegador. Quieres importar los recientes y favoritos que falten en tu cuenta?',
    importNow: 'Importar',
    importLater: 'Ahora no',
    importInProgress: 'Importando videos',
    importInProgressMessage:
      'Espera un momento mientras importamos tus recientes y favoritos locales.',
    importCompleted: 'Importacion completada',
    importCompletedMessage:
      'Se importaron correctamente los recientes y favoritos locales que faltaban en tu cuenta.',
    importPartial: 'Importacion completada con avisos',
    importPartialMessage:
      'Algunos videos no pudieron importarse por ahora. Puedes seguir usando la app e intentarlo de nuevo mas tarde.',
    demoModeActivated: 'Modo demo activado',
    demoModeActivatedMessage:
      'Los videos de demo están disponibles. Para salir del modo demo, abre el menú y selecciona "Desactivar modo demo".',
    transliterationAvailable: 'Transliteración disponible',
    transliterationAvailableMessage: 'Esta canción está en {language}. ¿Activar transliteración?',
    transliterationActivate: 'Activar',
    transliterationLater: 'Ahora no',
    transliterationLanguages: {
      ja: 'japonés',
      zh: 'chino',
      ko: 'coreano',
      el: 'griego',
      ru: 'ruso',
      ar: 'árabe',
      he: 'hebreo',
      th: 'tailandés'
    }
  }
} satisfies Translation;

export default es;
