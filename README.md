# Lyria

Lyria is a web application designed to provide a seamless experience for watching videos and viewing their lyrics simultaneously. It features real-time lyric synchronization and translation capabilities, making it a perfect companion for music lovers and language learners. It's a project I've done for fun, and for learning Svelte as well.

Built with SvelteKit and TypeScript, Lyria leverages modern web technologies to deliver a fast, responsive, and user-friendly interface.

## ✨ Features

- **Video Playback**: Watch your favorite videos directly in the app.
- **Synchronized Lyrics**: View lyrics that scroll in time with the video playback.
- **Multi-language Translation**: Translate lyrics into various languages using DeepL and other translation providers.
- **Modern Tech Stack**: Built with SvelteKit, TypeScript, and Vite.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [pnpm](https://pnpm.io/) (or npm/yarn)

### Installation

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/lyria.git
    cd lyria
    ```

2.  **Install dependencies:**
    ```sh
    pnpm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add any necessary API keys for translation services (e.g., DeepL).
    ```env
    # Example .env file
    DEEPL_API_KEY=your_deepl_api_key
    TRANSLATION_PROVIDER=deepl
    ```

    If you don't specify "Deepl" as translation provider, LibreTranslator will be used instead, so you need to pass the respective env variables to that service.

## 💻 Development

Once you've set up the project, you can start the development server:

```sh
# Start the development server
pnpm run dev

# Open the app in a new browser tab
pnpm run dev -- --open
```

The application will be available at `http://localhost:5173`.

### Available Scripts

- `pnpm run dev`: Starts the development server.
- `pnpm run build`: Creates a production build of the application.
- `pnpm run preview`: Previews the production build locally.
- `pnpm run check`: Runs Svelte check for type-checking.
- `pnpm run lint`: Lints the codebase using ESLint and Prettier.
- `pnpm run format`: Formats the codebase with Prettier.

## 📦 Building for Production

To create a production version of the app, run:

```sh
pnpm run build
```

This will create an optimized build in the `build` directory. You can preview the production build with `pnpm run preview`.
