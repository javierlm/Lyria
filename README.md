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
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for local libSQL database)

#### Optional: local libSQL database with Docker (recommended)

If you want local database support while running the app, start a local `sqld` container.

1. Start local database:

   ```powershell
   pnpm run db:dev
   ```

2. Run app in another terminal:

   ```powershell
   pnpm run dev
   ```

3. Stop local database when done:

   ```powershell
   pnpm run db:dev:stop
   ```

> The app uses `DATABASE_LOCAL_URL=http://127.0.0.1:8080` by default, so no extra change is required.

> If you need Turso CLI for remote database management, install it separately from https://docs.turso.tech/cli/installation.

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
    BETTER_AUTH_BASE_URL=http://localhost:5173
    BETTER_AUTH_PREVIEW_URL=
    BETTER_AUTH_SECRET=replace_with_a_minimum_32_char_secret

    # Social providers
    GOOGLE_CLIENT_ID=...
    GOOGLE_CLIENT_SECRET=...
    MICROSOFT_CLIENT_ID=...
    MICROSOFT_CLIENT_SECRET=...
    MICROSOFT_TENANT_ID=common
    SPOTIFY_CLIENT_ID=...
    SPOTIFY_CLIENT_SECRET=...
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
- `pnpm run dev:full`: Starts local Docker database and app together.
- `pnpm run build`: Creates a production build.
- `pnpm run preview`: Previews the production build locally.
- `pnpm run check`: Runs Svelte check for type-checking.
- `pnpm run lint`: Lints the codebase.
- `pnpm run format`: Formats the code using Prettier.
- `pnpm run test:db`: Runs integration tests against an isolated local test database.
- `pnpm run test:db:watch`: Watches integration tests against an isolated local test database.
- `pnpm run test:db:docker`: Runs database tests in Docker (app stays local).
- `pnpm run db:dev`: Starts local `sqld` in Docker.
- `pnpm run db:dev:stop`: Stops local Docker database.
- `pnpm run db:generate`: Generates Drizzle migrations.
- `pnpm run db:migrate`: Applies Drizzle migrations.
- `pnpm run auth:generate`: Generates Better Auth schema artifacts to `src/lib/server/db/auth-schema.ts`.
- `pnpm run auth:migrate`: Applies Drizzle migrations (Better Auth uses Drizzle in this project).
- `pnpm run typesafe-i18n`: Generates i18n types.
- `pnpm run sync:cache`: Syncs translation cache from remote to local.

> The app validates FTS5 support on startup. If validation fails, make sure the local Docker database is running (`pnpm run db:dev`).

### Database tests with Docker

You can keep running the app locally (`pnpm run dev`) and execute database tests in a reproducible Docker environment:

```sh
pnpm run test:db:docker
```

This command builds a test image, starts a temporary local `sqld` server, and runs integration tests in a reproducible environment.

## 📦 Building for Production

To create a production version of the app, run:

```sh
pnpm run build
```

This will create an optimized build using the `@sveltejs/adapter-vercel` adapter.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](file:///c:/Users/javit/Documents/proyectos/Lyria/LICENSE) file for details.
