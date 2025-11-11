// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface Platform {}
	}

	interface Window {
		onYouTubeIframeAPIReady: () => void;
		YT: typeof import('youtube-player/dist/types').YT;
	}
}

declare module '$env/static/private' {
	export const VERCEL: string;
	export const UPSTASH_REDIS_REST_URL: string;
	export const UPSTASH_REDIS_REST_TOKEN: string;
}

export {};
