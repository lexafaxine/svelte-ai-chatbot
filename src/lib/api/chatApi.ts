import { loadApiKey } from '$lib/stores/persistence';

export type StreamEvent =
	| { type: 'text'; delta: string }
	| { type: 'reasoning'; delta: string }
	| { type: 'error'; message: string };

export interface ChatRequestMessage {
	role: string;
	content: string;
}

export interface StreamChatOpts {
	messages: ChatRequestMessage[];
	model: string;
	signal: AbortSignal;
}

export interface RequestTitleOpts {
	userMessage: string;
	assistantMessage: string;
	model: string;
}

/**
 * Build JSON request headers with the BYOK OpenRouter key attached when
 * the user has configured one.
 *
 * @returns headers ready to drop into a `fetch` call.
 */
function buildAuthedJSONHeaders(): Record<string, string> {
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	const apiKey = loadApiKey();
	if (apiKey) headers['x-openrouter-key'] = apiKey;
	return headers;
}

/**
 * POST to `/api/chat` and yield NDJSON events as they arrive. Empty lines
 * and unparseable lines are skipped silently. Throws on non-OK responses
 * and when the abort signal fires (fetch rejects with `AbortError`).
 *
 * @param opts.messages — active path messages to send to the model.
 * @param opts.model — OpenRouter model id.
 * @param opts.signal — `AbortSignal` that cancels the underlying fetch.
 * @yields one {@link StreamEvent} per parsed NDJSON line.
 */
export async function* streamChat(opts: StreamChatOpts): AsyncGenerator<StreamEvent> {
	const response = await fetch('/api/chat', {
		method: 'POST',
		headers: buildAuthedJSONHeaders(),
		body: JSON.stringify({ messages: opts.messages, model: opts.model }),
		signal: opts.signal
	});

	if (!response.ok || !response.body) {
		const errText = await response.text().catch(() => '');
		throw new Error(errText || `Request failed with status ${response.status}`);
	}

	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = '';

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });

		let newlineIndex = buffer.indexOf('\n');
		while (newlineIndex !== -1) {
			const line = buffer.slice(0, newlineIndex).trim();
			buffer = buffer.slice(newlineIndex + 1);
			newlineIndex = buffer.indexOf('\n');
			if (!line) continue;

			try {
				yield JSON.parse(line) as StreamEvent;
			} catch {
				// Malformed line — skip and keep streaming.
			}
		}
	}
}

/**
 * POST to `/api/title`. Best-effort: returns the raw model-generated title
 * on success, or `null` for any failure mode (network error, non-OK
 * response, missing or empty `title` field, malformed JSON).
 *
 * @param opts.userMessage — first user message content.
 * @param opts.assistantMessage — first assistant reply content.
 * @param opts.model — OpenRouter model id.
 * @returns the title string, or `null` on any failure.
 */
export async function requestTitle(opts: RequestTitleOpts): Promise<string | null> {
	try {
		const response = await fetch('/api/title', {
			method: 'POST',
			headers: buildAuthedJSONHeaders(),
			body: JSON.stringify({
				userMessage: opts.userMessage,
				assistantMessage: opts.assistantMessage,
				model: opts.model
			})
		});
		if (!response.ok) return null;
		const { title } = (await response.json()) as { title?: string };
		return title ?? null;
	} catch {
		return null;
	}
}
