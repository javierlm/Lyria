/// <reference types="vite-plugin-pwa/svelte" />
/// <reference types="vite-plugin-pwa/info" />
// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare namespace svelte.JSX {
  interface HTMLAttributes {
    'on:swipe'?: (event: CustomEvent<{ x: number; y: number; dx: number; dy: number }>) => void;
  }
}

declare global {
  interface AuthSession {
    id: string;
    userId: string;
    expiresAt: Date;
  }

  interface AuthUser {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified?: boolean;
  }

  namespace App {
    // interface Error {}
    interface Locals {
      locale?: string;
      session?: AuthSession;
      user?: AuthUser;
    }

    interface PageData {
      locale: string;
      session?: AuthSession;
      user?: AuthUser;
    }

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
  export const BETTER_AUTH_SECRET: string;
  export const BETTER_AUTH_BASE_URL: string;
  export const BETTER_AUTH_URL: string;
  export const GOOGLE_CLIENT_ID: string;
  export const GOOGLE_CLIENT_SECRET: string;
  export const MICROSOFT_CLIENT_ID: string;
  export const MICROSOFT_CLIENT_SECRET: string;
  export const MICROSOFT_TENANT_ID: string;
  export const SPOTIFY_CLIENT_ID: string;
  export const SPOTIFY_CLIENT_SECRET: string;
  export const DATABASE_MODE: string;
  export const DATABASE_URL: string;
  export const DATABASE_AUTH_TOKEN: string;
  export const DATABASE_LOCAL_URL: string;
}

export {};
