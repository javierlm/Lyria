import { browser } from '$app/environment';

export type Theme = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme-preference';

function createThemeStore() {
	let theme = $state<Theme>('system');

	function getSystemTheme(): 'light' | 'dark' {
		if (!browser) return 'light';
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}

	function applyTheme(newTheme: Theme) {
		if (!browser) return;

		const effectiveTheme = newTheme === 'system' ? getSystemTheme() : newTheme;

		if (effectiveTheme === 'dark') {
			document.documentElement.classList.add('dark-mode');
		} else {
			document.documentElement.classList.remove('dark-mode');
		}
	}

	function init() {
		if (!browser) return;

		const storedTheme = localStorage.getItem(STORAGE_KEY) as Theme | null;
		if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
			theme = storedTheme;
		}

		applyTheme(theme);

		// Listen for system changes
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
		const handleChange = () => {
			if (theme === 'system') {
				applyTheme('system');
			}
		};

		mediaQuery.addEventListener('change', handleChange);
		return () => mediaQuery.removeEventListener('change', handleChange);
	}

	// Initialize immediately if in browser
	if (browser) {
		init();
	}

	return {
		get theme() {
			return theme;
		},
		setTheme(newTheme: Theme) {
			theme = newTheme;
			if (browser) {
				localStorage.setItem(STORAGE_KEY, newTheme);
				applyTheme(newTheme);
			}
		},
		toggle() {
			const currentEffective = theme === 'system' ? getSystemTheme() : theme;

			// Simple toggle logic: if dark -> light, else -> dark.
			// This overrides 'system' to a manual choice.
			const nextTheme = currentEffective === 'dark' ? 'light' : 'dark';
			this.setTheme(nextTheme);
		}
	};
}

export const themeStore = createThemeStore();
