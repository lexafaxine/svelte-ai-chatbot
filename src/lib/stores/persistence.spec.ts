import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Conversation, Message } from '$lib/types';

function createFakeStorage() {
	const store = new Map<string, string>();
	return {
		store,
		api: {
			getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
			setItem: (k: string, v: string) => {
				store.set(k, v);
			},
			removeItem: (k: string) => {
				store.delete(k);
			},
			clear: () => store.clear(),
			key: (i: number) => Array.from(store.keys())[i] ?? null,
			get length() {
				return store.size;
			}
		}
	};
}

beforeEach(async () => {
	vi.resetModules();
	const fake = createFakeStorage();
	vi.stubGlobal('localStorage', fake.api);
	vi.stubGlobal('window', { localStorage: fake.api });
});

async function importPersistence() {
	return await import('./persistence');
}

describe('conversations persistence', () => {
	it('returns empty array when nothing is stored', async () => {
		const { loadConversations } = await importPersistence();
		expect(loadConversations()).toEqual([]);
	});

	it('round-trips conversation list', async () => {
		const { loadConversations, saveConversations } = await importPersistence();
		const convs: Conversation[] = [
			{ id: 'c1', title: 'First', model: 'm', tailId: null, activeChildMap: {}, createdAt: 1, updatedAt: 2 }
		];
		saveConversations(convs);
		expect(loadConversations()).toEqual(convs);
	});

	it('returns fallback when stored value is invalid JSON', async () => {
		localStorage.setItem('chat:conversations', '{not json');
		const { loadConversations } = await importPersistence();
		expect(loadConversations()).toEqual([]);
	});
});

describe('messages persistence', () => {
	it('round-trips message list', async () => {
		const { loadMessages, saveMessages } = await importPersistence();
		const messages: Message[] = [
			{
				id: 'm1',
				conversationId: 'c1',
				parentId: null,
				role: 'user',
				content: 'hi',
				model: 'm',
				createdAt: 1
			}
		];
		saveMessages(messages);
		expect(loadMessages()).toEqual(messages);
	});
});

describe('api key persistence', () => {
	it('returns null when no key stored', async () => {
		const { loadApiKey } = await importPersistence();
		expect(loadApiKey()).toBeNull();
	});

	it('stores and retrieves a raw string (no JSON encoding)', async () => {
		const { loadApiKey, saveApiKey } = await importPersistence();
		saveApiKey('sk-or-xyz');
		expect(loadApiKey()).toBe('sk-or-xyz');
		expect(localStorage.getItem('chat:openrouterKey')).toBe('sk-or-xyz');
	});

	it('removes the key when saving null', async () => {
		const { loadApiKey, saveApiKey } = await importPersistence();
		saveApiKey('sk-or-xyz');
		saveApiKey(null);
		expect(loadApiKey()).toBeNull();
		expect(localStorage.getItem('chat:openrouterKey')).toBeNull();
	});
});
