# Lyria

Lyria is a modern web application designed for music lovers and language learners. It provides a seamless experience for watching YouTube videos while viewing synchronized lyrics and real-time translations.

Built with **Svelte 5** and **SvelteKit**, Lyria leverages the latest web technologies to deliver a fast, responsive, and immersive interface.

## ✨ Features

- **📺 Video Playback**: Seamless YouTube integration for high-quality video streaming.
- **🎵 Synchronized Lyrics**: Real-time lyric display and automatic scrolling synchronized with video playback (via LRCLib).
- **🌍 Real-time Translation**: Instant translation of lyrics into multiple languages using DeepL, LibreTranslate, or the experimental **Chrome AI** (Google Chrome's local translation API) when available.
- **⚡ Performance Caching**: Fast lyric and translation loading powered by Redis (Upstash) in production and local filesystem in development.
- **📱 PWA Ready**: Installable web app with offline support, update notifications, and Share Target API integration.
- **🔥 Svelte 5 Power**: Utilizes Svelte 5 Runes for highly efficient and maintainable reactivity.
- **🌐 Internationalization**: Fully localized UI with type-safe translations (typesafe-i18n).
- **🌗 Smart Theming**: Beautiful dark and light modes with automatic system preference detection.
- **🖥️ Responsive Layout**: Optimized for all screens, from mobile devices to 4K displays.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or higher recommended)
- [pnpm](https://pnpm.io/)

### Installation

1.  **Clone the repository:**

    ```sh
    git clone https://github.com/javierlm/Lyria.git
    cd Lyria
    ```

2.  **Install dependencies:**

    ```sh
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project.

    ```env
    # Translation Provider (deepl, chrome-ai, or omit for LibreTranslate)
    TRANSLATION_PROVIDER=deepl

    # DeepL API Key (if using DeepL)
    DEEPL_API_KEY=your_deepl_api_key

    # Redis / Upstash (for caching)
    UPSTASH_REDIS_REST_URL=your_upstash_url
    UPSTASH_REDIS_REST_TOKEN=your_upstash_token

    # Deployment
    VERCEL=1 # Set to 1 when deploying to Vercel
    ```

## 💻 Development

Start the development server:

```sh
pnpm run dev
```

The application will be available at `http://localhost:5173`.

### Available Scripts

- `pnpm run dev`: Starts the development server.
- `pnpm run build`: Creates a production build.
- `pnpm run preview`: Previews the production build locally.
- `pnpm run check`: Runs Svelte check for type-checking.
- `pnpm run lint`: Lints the codebase.
- `pnpm run format`: Formats the code using Prettier.
- `pnpm run typesafe-i18n`: Generates i18n types.
- `pnpm run sync:cache`: Syncs translation cache from remote to local.

## 📦 Building for Production

To create a production version of the app, run:

```sh
pnpm run build
```

This will create an optimized build using the `@sveltejs/adapter-vercel` adapter.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](file:///c:/Users/javit/Documents/proyectos/Lyria/LICENSE) file for details.
