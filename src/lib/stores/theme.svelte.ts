import { browser } from '$app/environment';
import { loadTheme, saveTheme, type Theme } from './persistence';

/**
 * Best-effort detection of the OS color-scheme preference, used as the
 * initial value when the user has never explicitly chosen a theme.
 *
 * @returns `'dark'` if the OS prefers dark mode, otherwise `'light'`.
 */
function detectSystemTheme(): Theme {
	if (!browser) return 'light';
	return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Reactive theme store. Reads `chat:theme` on init (falling back to the OS
 * preference), and on every change flips the `dark` class on `<html>` and
 * writes the new value back to localStorage.
 *
 * @returns an object exposing the current theme and a `toggle()` method.
 */
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

/** Singleton theme store. Import as `theme` and read `theme.current` / call `theme.toggle()`. */
export const theme = createThemeStore();
