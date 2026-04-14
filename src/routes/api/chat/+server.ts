import { streamText, type ModelMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

interface ChatRequestBody {
	messages: ModelMessage[];
	model: string;
}

/**
 * POST /api/chat — proxy a chat completion through OpenRouter and stream
 * the result back to the browser as NDJSON.
 *
 * Body: `{ messages: ModelMessage[]; model: string }` — `messages` is the
 * already-resolved active path from the message tree.
 *
 * Auth (BYOK): the OpenRouter key is read from the `x-openrouter-key`
 * header first, with `OPENROUTER_API_KEY` as a server-side fallback for dev.
 *
 * Response: `application/x-ndjson`. One JSON object per line, each being
 * `{type: 'text', delta}`, `{type: 'reasoning', delta}`, or
 * `{type: 'error', message}`. We consume `result.fullStream` ourselves
 * rather than using `toTextStreamResponse()` so that provider-level errors
 * reach the client instead of being silently swallowed as an empty stream.
 */
export const POST: RequestHandler = async ({ request }) => {
	const apiKey = request.headers.get('x-openrouter-key') ?? env.OPENROUTER_API_KEY;
	if (!apiKey) {
		return new Response('Missing OpenRouter API key', { status: 401 });
	}

	let body: ChatRequestBody;
	try {
		body = (await request.json()) as ChatRequestBody;
	} catch {
		return new Response('Invalid JSON body', { status: 400 });
	}

	if (!Array.isArray(body.messages) || body.messages.length === 0 || !body.model) {
		return new Response('messages and model are required', { status: 400 });
	}

	const openrouter = createOpenRouter({ apiKey });
	const result = streamText({
		model: openrouter(body.model),
		messages: body.messages,
		// OpenRouter silently ignores `reasoning` for models that don't support it,
		// so we can pass it unconditionally.
		providerOptions: {
			openrouter: {
				reasoning: { effort: 'medium' }
			}
		}
	});

	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (obj: Record<string, unknown>) => {
				controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
			};
			try {
				for await (const part of result.fullStream) {
					if (part.type === 'text-delta') {
						send({ type: 'text', delta: part.text });
					} else if (part.type === 'reasoning-delta') {
						send({ type: 'reasoning', delta: part.text });
					} else if (part.type === 'error') {
						const message = part.error instanceof Error ? part.error.message : String(part.error);
						send({ type: 'error', message });
					}
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				send({ type: 'error', message });
			} finally {
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'application/x-ndjson; charset=utf-8',
			'Cache-Control': 'no-cache, no-transform',
			'X-Accel-Buffering': 'no'
		}
	});
};
