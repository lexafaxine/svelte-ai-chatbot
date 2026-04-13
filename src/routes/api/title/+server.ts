import { generateText, type ModelMessage } from 'ai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';

interface TitleRequestBody {
	userMessage: string;
	assistantMessage: string;
	model: string;
}

const SYSTEM_PROMPT =
	'You generate very short conversation titles. Respond with a single title of at most 6 words. ' +
	'No quotes, no trailing punctuation, no prefixes like "Title:". ' +
	'Match the dominant language of the conversation.';

export const POST: RequestHandler = async ({ request }) => {
	const apiKey = request.headers.get('x-openrouter-key') ?? env.OPENROUTER_API_KEY;
	if (!apiKey) {
		return new Response('Missing OpenRouter API key', { status: 401 });
	}

	let body: TitleRequestBody;
	try {
		body = (await request.json()) as TitleRequestBody;
	} catch {
		return new Response('Invalid JSON body', { status: 400 });
	}

	if (!body.userMessage || !body.assistantMessage || !body.model) {
		return new Response('userMessage, assistantMessage and model are required', { status: 400 });
	}

	const messages: ModelMessage[] = [
		{ role: 'system', content: SYSTEM_PROMPT },
		{
			role: 'user',
			content: `Write a title for this exchange:\n\nUser: ${body.userMessage}\n\nAssistant: ${body.assistantMessage}`
		}
	];

	try {
		const openrouter = createOpenRouter({ apiKey });
		const { text } = await generateText({
			model: openrouter(body.model),
			messages
		});
		return new Response(JSON.stringify({ title: text }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return new Response(message, { status: 502 });
	}
};
