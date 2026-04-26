import { describe, it, expect } from 'vitest';
import { matchesShortcut, formatShortcut, SHORTCUTS, type Shortcut } from './shortcuts';

function shortcut(overrides: Partial<Shortcut> = {}): Shortcut {
	return {
		id: 'test',
		description: 'Test',
		mod: true,
		shift: false,
		code: 'KeyK',
		key: 'K',
		...overrides
	};
}

// `matchesShortcut` only reads `code`, `metaKey`, `ctrlKey`, and `shiftKey`,
// so we can fake a KeyboardEvent with a plain object — `KeyboardEvent` is
// not defined in the Node test environment.
function ev(init: {
	code: string;
	metaKey?: boolean;
	ctrlKey?: boolean;
	shiftKey?: boolean;
}): KeyboardEvent {
	return {
		code: init.code,
		metaKey: !!init.metaKey,
		ctrlKey: !!init.ctrlKey,
		shiftKey: !!init.shiftKey
	} as KeyboardEvent;
}

describe('matchesShortcut', () => {
	it('matches when code, mod, and shift all align (metaKey)', () => {
		expect(matchesShortcut(ev({ code: 'KeyK', metaKey: true }), shortcut())).toBe(true);
	});

	it('matches when ctrlKey stands in for the mod key (non-Mac)', () => {
		expect(matchesShortcut(ev({ code: 'KeyK', ctrlKey: true }), shortcut())).toBe(true);
	});

	it('rejects when code differs', () => {
		expect(matchesShortcut(ev({ code: 'KeyJ', metaKey: true }), shortcut())).toBe(false);
	});

	it('rejects when mod is required but no modifier is held', () => {
		expect(matchesShortcut(ev({ code: 'KeyK' }), shortcut({ mod: true }))).toBe(false);
	});

	it('rejects when mod is forbidden but a modifier is held', () => {
		expect(matchesShortcut(ev({ code: 'KeyK', metaKey: true }), shortcut({ mod: false }))).toBe(
			false
		);
	});

	it('rejects when shift is required but not held', () => {
		expect(
			matchesShortcut(ev({ code: 'KeyO', metaKey: true }), shortcut({ code: 'KeyO', shift: true }))
		).toBe(false);
	});

	it('rejects when shift is held but not required', () => {
		expect(
			matchesShortcut(
				ev({ code: 'KeyK', metaKey: true, shiftKey: true }),
				shortcut({ shift: false })
			)
		).toBe(false);
	});

	it('matches the registered SHORTCUTS.searchConversations', () => {
		expect(
			matchesShortcut(ev({ code: 'KeyK', metaKey: true }), SHORTCUTS.searchConversations)
		).toBe(true);
	});

	it('matches the registered SHORTCUTS.newConversation only with shift', () => {
		expect(matchesShortcut(ev({ code: 'KeyO', metaKey: true }), SHORTCUTS.newConversation)).toBe(
			false
		);
		expect(
			matchesShortcut(
				ev({ code: 'KeyO', metaKey: true, shiftKey: true }),
				SHORTCUTS.newConversation
			)
		).toBe(true);
	});
});

describe('formatShortcut', () => {
	it('uses ⌘ on Mac', () => {
		expect(formatShortcut(shortcut(), true)).toBe('⌘ + K');
	});

	it('uses Ctrl on non-Mac', () => {
		expect(formatShortcut(shortcut(), false)).toBe('Ctrl + K');
	});

	it('inserts Shift between the modifier and the key', () => {
		expect(formatShortcut(shortcut({ shift: true, code: 'KeyO', key: 'O' }), true)).toBe(
			'⌘ + Shift + O'
		);
	});

	it('omits the modifier when mod is false', () => {
		expect(formatShortcut(shortcut({ mod: false }), true)).toBe('K');
	});

	it('formats the registered shortcuts as expected on Mac', () => {
		expect(formatShortcut(SHORTCUTS.searchConversations, true)).toBe('⌘ + K');
		expect(formatShortcut(SHORTCUTS.newConversation, true)).toBe('⌘ + Shift + O');
	});
});
