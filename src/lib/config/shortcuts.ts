/**
 * A keyboard shortcut definition. Single source of truth for both the
 * keydown handler ({@link matchesShortcut}) and the help dialog
 * ({@link formatShortcut})
 */
export interface Shortcut {
	id: string;
	description: string; // shown verbatim in the shortcuts dialog
	mod: boolean; // true = Cmd on Mac, Ctrl elsewhere
	shift: boolean;
	code: string; // KeyboardEvent.code (e.g. 'KeyK'), layout-independent
	key: string; // display character (e.g. 'K')
}

export const SHORTCUTS = {
	searchConversations: {
		id: 'searchConversations',
		description: 'Search conversations',
		mod: true,
		shift: false,
		code: 'KeyK',
		key: 'K'
	},
	newConversation: {
		id: 'newConversation',
		description: 'New conversation',
		mod: true,
		shift: true,
		code: 'KeyO',
		key: 'O'
	}
} as const satisfies Record<string, Shortcut>;

/**
 * Test whether a `keydown` event matches a shortcut definition.
 *
 * @param e — the KeyboardEvent.
 * @param s — the shortcut to match against.
 * @returns `true` when the event's `code`, modifier, and shift state all
 *   match `s`.
 */
export function matchesShortcut(e: KeyboardEvent, s: Shortcut): boolean {
	const mod = e.metaKey || e.ctrlKey;
	return e.code === s.code && (s.mod ? mod : !mod) && e.shiftKey === s.shift;
}

/**
 * Render a shortcut as a human-readable string for the help dialog,
 * picking the modifier label appropriate for the platform.
 *
 * @param s — the shortcut to render.
 * @param isMac — `true` to render the Mac modifier (`⌘`), `false` for `Ctrl`.
 * @returns the shortcut as e.g. `'⌘ + Shift + O'`.
 */
export function formatShortcut(s: Shortcut, isMac: boolean): string {
	const parts: string[] = [];
	if (s.mod) parts.push(isMac ? '⌘' : 'Ctrl');
	if (s.shift) parts.push('Shift');
	parts.push(s.key);
	return parts.join(' + ');
}
