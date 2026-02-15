import { auth } from '$lib/server/auth';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';
import type { RequestHandler } from '@sveltejs/kit';

const authHandler = toSvelteKitHandler(auth);

export const GET: RequestHandler = ({ request }) => authHandler({ request });
export const POST: RequestHandler = ({ request }) => authHandler({ request });
