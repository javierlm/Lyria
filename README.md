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
- [Turso CLI](https://docs.turso.tech/cli/installation) (for local database development)

#### Installing Turso CLI

**Linux/macOS:**

```sh
curl -sSfL https://get.tur.so/install.sh | bash
```

**Windows with WSL (Recommended):**

1. Install Turso in WSL:

   ```sh
   wsl bash -c 'curl -sSfL https://get.tur.so/install.sh | bash'
   ```

2. Add a PowerShell function to use Turso from PowerShell:

   ```powershell
   # Add to your PowerShell profile
   function turso { wsl ~/.turso/turso @args }
   ```

3. Verify installation:
   ```powershell
   turso --version
   ```

> **Note:** Windows native installation via PowerShell installer exists but may install older versions. WSL installation is recommended for the latest version.
>
> **Important for WSL users:** After installation, make sure Turso is in your WSL PATH by adding it to `~/.profile` (this is in addition to `~/.bashrc`). The project includes a cross-platform wrapper script (`scripts/turso-wrapper.js`) that automatically handles Turso execution on both Windows (via WSL) and Unix systems, so `pnpm run db:dev` works seamlessly on all platforms.

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

    # Database (libSQL/Turso)
    # In development, run `pnpm run db:dev` and keep DATABASE_MODE=auto
    DATABASE_MODE=auto
    DATABASE_LOCAL_URL=http://127.0.0.1:8080

    # In production (or if DATABASE_MODE=remote), use Turso URL/token
    DATABASE_URL=libsql://your-turso-database-url
    DATABASE_AUTH_TOKEN=your_turso_auth_token

    # Better Auth
    BETTER_AUTH_URL=http://localhost:5173
    BETTER_AUTH_SECRET=replace_with_a_minimum_32_char_secret

    # Social providers
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    MICROSOFT_CLIENT_ID=...
    MICROSOFT_CLIENT_SECRET=...
    MICROSOFT_TENANT_ID=common
    SPOTIFY_CLIENT_ID=...
    SPOTIFY_CLIENT_SECRET=...
    DEEZER_CLIENT_ID=...
    DEEZER_CLIENT_SECRET=...
    ```

## 💻 Development

Start the development server:

```sh
pnpm run dev
```

Start local database + app together:

```sh
pnpm run dev:full
```

The application will be available at `http://localhost:5173`.

### Available Scripts

- `pnpm run dev`: Starts the development server.
- `pnpm run dev:full`: Starts local libSQL database and app together.
- `pnpm run build`: Creates a production build.
- `pnpm run preview`: Previews the production build locally.
- `pnpm run check`: Runs Svelte check for type-checking.
- `pnpm run lint`: Lints the codebase.
- `pnpm run format`: Formats the code using Prettier.
- `pnpm run db:dev`: Starts local libSQL server (Turso CLI) with `local.db`.
- `pnpm run db:generate`: Generates Drizzle migrations.
- `pnpm run db:migrate`: Applies Drizzle migrations.
- `pnpm run auth:generate`: Generates Better Auth schema artifacts.
- `pnpm run auth:migrate`: Applies Better Auth migrations.
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
