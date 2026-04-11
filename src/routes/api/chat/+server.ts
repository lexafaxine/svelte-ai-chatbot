import { streamText, type ModelMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';
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
	const result = streamText({
		model: openrouter(body.model),
		messages: body.messages
	});

	return result.toTextStreamResponse();
};
