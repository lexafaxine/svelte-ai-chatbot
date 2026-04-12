import type { Conversation, Message } from '$lib/types';

const CONVERSATIONS_KEY = 'chat:conversations';
const MESSAGES_KEY = 'chat:messages';
const API_KEY_KEY = 'chat:openrouterKey';
const THEME_KEY = 'chat:theme';

export type Theme = 'light' | 'dark';

function isBrowser(): boolean {
	return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function read<T>(key: string, fallback: T): T {
	if (!isBrowser()) return fallback;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : fallback;
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown): void {
	if (!isBrowser()) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// localStorage full / disabled — silently drop; UI state stays in memory
	}
}

export function loadConversations(): Conversation[] {
	return read<Conversation[]>(CONVERSATIONS_KEY, []);
}

export function saveConversations(conversations: Conversation[]): void {
	write(CONVERSATIONS_KEY, conversations);
}

export function loadMessages(): Message[] {
	return read<Message[]>(MESSAGES_KEY, []);
}

export function saveMessages(messages: Message[]): void {
	write(MESSAGES_KEY, messages);
}

export function loadApiKey(): string | null {
	if (!isBrowser()) return null;
	return localStorage.getItem(API_KEY_KEY);
}

export function saveApiKey(key: string | null): void {
	if (!isBrowser()) return;
	if (key) localStorage.setItem(API_KEY_KEY, key);
	else localStorage.removeItem(API_KEY_KEY);
}

export function loadTheme(): Theme | null {
	if (!isBrowser()) return null;
	const raw = localStorage.getItem(THEME_KEY);
	return raw === 'dark' || raw === 'light' ? raw : null;
}

export function saveTheme(theme: Theme): void {
	if (!isBrowser()) return;
	localStorage.setItem(THEME_KEY, theme);
}
