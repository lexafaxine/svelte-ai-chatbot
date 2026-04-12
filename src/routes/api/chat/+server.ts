import { streamText, type ModelMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';
import { isReasoningModel } from '$lib/config/models';
import type { RequestHandler } from './$types';

interface ChatRequestBody {
	messages: ModelMessage[];
	model: string;
}

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
	const languageModel = isReasoningModel(body.model)
		? openrouter(body.model, { reasoning: { effort: 'medium' } })
		: openrouter(body.model);

	const result = streamText({
		model: languageModel,
		messages: body.messages
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
