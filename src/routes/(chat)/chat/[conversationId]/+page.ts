import { redirect } from '@sveltejs/kit';
import { chat } from '$lib/stores/chatStore.svelte';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const conversation = chat.getConversation(params.conversationId);
	if (!conversation) {
		throw redirect(307, '/');
	}
	return { conversation };
};
