import type { Conversation, Message } from '$lib/types';

export interface ExportedConversation {
	title: string;
	model: string;
	createdAt: string;
	updatedAt: string;
	messages: {
		role: string;
		content: string;
		model: string;
		reasoning?: string;
		createdAt: string;
	}[];
}

export function buildExportData(
	conversation: Conversation,
	activePath: Message[]
): ExportedConversation {
	return {
		title: conversation.title,
		model: conversation.model,
		createdAt: new Date(conversation.createdAt).toISOString(),
		updatedAt: new Date(conversation.updatedAt).toISOString(),
		messages: activePath.map((m) => {
			const entry: ExportedConversation['messages'][number] = {
				role: m.role,
				content: m.content,
				model: m.model,
				createdAt: new Date(m.createdAt).toISOString()
			};
			if (m.reasoning) entry.reasoning = m.reasoning;
			return entry;
		})
	};
}

export function downloadConversationJSON(conversation: Conversation, activePath: Message[]): void {
	const data = buildExportData(conversation, activePath);
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `${conversation.title.replace(/[/\\?%*:|"<>]/g, '_')}.json`;
	a.click();

	URL.revokeObjectURL(url);
}
