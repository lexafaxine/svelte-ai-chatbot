import { browser } from '$app/environment';
import { loadTheme, saveTheme, type Theme } from './persistence';

function detectSystemTheme(): Theme {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function createThemeStore() {
	const initial: Theme = browser ? (loadTheme() ?? detectSystemTheme()) : 'light';
	let current = $state<Theme>(initial);

	if (browser) {
		$effect.root(() => {
			$effect(() => {
				const root = document.documentElement;
				if (current === 'dark') root.classList.add('dark');
				else root.classList.remove('dark');
				saveTheme(current);
			});
		});
	}

	return {
		get current() {
			return current;
		},
		toggle() {
			current = current === 'dark' ? 'light' : 'dark';
		}
	};
}

export const theme = createThemeStore();
