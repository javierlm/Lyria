import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	server: {
		host: '0.0.0.0',
		port: 5173
	},
	optimizeDeps: {
		include: ['phosphor-svelte', '@fontsource/inter', 'typesafe-i18n', 'workbox-window'],
		exclude: ['cld3-asm']
	},
	ssr: {
		external: ['cld3-asm'],
		noExternal: []
	},
	plugins: [
		SvelteKitPWA({
			registerType: 'prompt',
			includeAssets: ['favicon.svg', 'robots.txt'],
			manifest: {
				name: 'Lyria',
				short_name: 'Lyria',
				description: 'Your music companion',
				theme_color: '#ef4444',
				background_color: '#101523',
				display: 'fullscreen',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png'
					},
					{
						src: 'maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
				navigateFallback: null
			},
			devOptions: {
				enabled: false,
				suppressWarnings: true,
				navigateFallback: '/',
				type: 'module'
			}
		}),
		sveltekit()
	]
});
