import type { Conversation, Message } from '$lib/types';

const CONVERSATIONS_KEY = 'chat:conversations';
const MESSAGES_KEY = 'chat:messages';
const API_KEY_KEY = 'chat:openrouterKey';
const THEME_KEY = 'chat:theme';

export type Theme = 'light' | 'dark';

function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/**
 * Read and JSON-parse a value from localStorage.
 *
 * @param key — localStorage key.
 * @param fallback — value to return when the key is missing, the parse fails, or we're not in a browser.
 * @returns the parsed value, or `fallback`.
 */
function read<T>(key: string, fallback: T): T {
	if (!isBrowser()) return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

/**
 * JSON-stringify and write a value to localStorage. Silently drops the write
 * outside the browser or when storage is full / disabled
 *
 * @param key — localStorage key.
 * @param value — anything JSON-serializable.
 */
function write(key: string, value: unknown): void {
	if (!isBrowser()) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// localStorage full / disabled — silently drop; UI state stays in memory
	}
}

/**
 * Load all persisted conversations.
 *
 * @returns the stored list, or `[]` if nothing has been saved yet.
 */
export function loadConversations(): Conversation[] {
	return read<Conversation[]>(CONVERSATIONS_KEY, []);
}

/**
 * Persist the full conversation list. Replaces whatever was stored before.
 *
 * @param conversations — the entire list to write.
 */
export function saveConversations(conversations: Conversation[]): void {
	write(CONVERSATIONS_KEY, conversations);
}

/**
 * Load all persisted messages across every conversation. Filtering by
 * conversation is the caller's responsibility for simplicity.
 *
 * @returns the stored list, or `[]` if nothing has been saved yet.
 */
export function loadMessages(): Message[] {
	return read<Message[]>(MESSAGES_KEY, []);
}

/**
 * Persist the full message list. Replaces whatever was stored before.
 *
 * @param messages — the entire flat list across all conversations.
 */
export function saveMessages(messages: Message[]): void {
	write(MESSAGES_KEY, messages);
}

/**
 * Read the user's OpenRouter API key. Stored as a raw string
 *
 * @returns the key, or `null` if unset / not in a browser.
 */
export function loadApiKey(): string | null {
	if (!isBrowser()) return null;
	return localStorage.getItem(API_KEY_KEY);
}

/**
 * Persist the user's OpenRouter API key. Passing `null` clears it.
 *
 * @param key — the raw key string, or `null` to remove it.
 */
export function saveApiKey(key: string | null): void {
	if (!isBrowser()) return;
	if (key) localStorage.setItem(API_KEY_KEY, key);
	else localStorage.removeItem(API_KEY_KEY);
}

/**
 * Read the user's saved color-scheme preference. Returns `null` when the
 * user has never explicitly chosen one (so the caller can fall back to the
 * OS preference).
 *
 * @returns `'light'`, `'dark'`, or `null` if unset / corrupted / SSR.
 */
export function loadTheme(): Theme | null {
	if (!isBrowser()) return null;
	const raw = localStorage.getItem(THEME_KEY);
	return raw === 'dark' || raw === 'light' ? raw : null;
}

/**
 * Persist the user's color-scheme preference.
 *
 * @param theme — `'light'` or `'dark'`.
 */
export function saveTheme(theme: Theme): void {
	if (!isBrowser()) return;
	localStorage.setItem(THEME_KEY, theme);
}
