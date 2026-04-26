export const DEFAULT_TITLE = 'New chat';
const MAX_TITLE_LEN = 60;
const PRELIMINARY_TITLE_LEN = 50;

/**
 * Normalize an AI model-generated title: collapse whitespace, strip wrapping
 * quotes and clip to {@link MAX_TITLE_LEN}.
 *
 * @param raw — title text returned by the title API.
 * @returns the cleaned title.
 */
export function sanitizeTitle(raw: string): string {
	let t = raw.trim().replace(/\s+/g, ' ');
	// Strip leading/trailing matched quotes (single, double, or CJK).
	t = t.replace(/^["'“”‘’《「『]+|["'“”‘’》」』.。!！?？,，;；:：]+$/g, '').trim();
	if (t.length > MAX_TITLE_LEN) t = t.slice(0, MAX_TITLE_LEN).trimEnd() + '…';
	return t;
}

/**
 * Derive a temporary title from the user's first message, used until the
 * async AI title arrives.
 *
 * @param text — the first user message content.
 * @returns the placeholder title (`'New chat'` if the input is empty).
 */
export function makePreliminaryTitle(text: string): string {
	const normalized = text.trim().replace(/\s+/g, ' ');
	if (!normalized) return DEFAULT_TITLE;
	if (normalized.length <= PRELIMINARY_TITLE_LEN) return normalized;
	return normalized.slice(0, PRELIMINARY_TITLE_LEN).trimEnd() + '…';
}
