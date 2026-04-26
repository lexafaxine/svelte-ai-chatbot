import { nanoid } from 'nanoid';
import type { Conversation, Message } from '$lib/types';
import { getActivePath } from './message-tree';

/**
 * How much of the source conversation to copy when forking.
 *
 * - `'active-path'`: only the messages on the visible thread up to the chosen
 *   message; the new conversation starts with an empty `activeChildMap`.
 * - `'full-history'`: every message created at or before the chosen one
 *   (including off-path branches), with `activeChildMap` rewritten to point
 *   at the cloned ids.
 */
export type ForkMode = 'active-path' | 'full-history';

export interface BuildForkOpts {
	source: Conversation;
	sourceMessages: Message[]; // already filtered to `source.id`
	atMessageId: string;
	mode: ForkMode;
}

export interface BuildForkResult {
	conversation: Conversation;
	messages: Message[]; // newly cloned messages, parented inside the new conversation
}

/**
 * Build a new conversation + cloned message set from a fork point.
 *
 * @param opts.source — the source conversation row.
 * @param opts.sourceMessages — every message belonging to the source.
 * @param opts.atMessageId — message that becomes the new conversation's tail.
 * @param opts.mode — see {@link ForkMode}.
 * @returns the new conversation + cloned messages, or `null` if no messages
 *   would be cloned (e.g. `atMessageId` is unknown).
 */
export function buildFork(opts: BuildForkOpts): BuildForkResult | null {
	const { source, sourceMessages, atMessageId, mode } = opts;

	let toClone: Message[];
	if (mode === 'active-path') {
		toClone = getActivePath(sourceMessages, atMessageId);
	} else {
		const byId = new Map(sourceMessages.map((m) => [m.id, m]));
		const targetTime = byId.get(atMessageId)?.createdAt ?? Infinity;
		toClone = sourceMessages.filter((m) => m.createdAt <= targetTime);
	}

	if (toClone.length === 0) return null;

	const idMap = new Map<string, string>();
	for (const m of toClone) {
		idMap.set(m.id, nanoid());
	}

	const now = Date.now();
	const newConvId = nanoid();

	const messages: Message[] = toClone.map((m) => ({
		id: idMap.get(m.id)!,
		conversationId: newConvId,
		parentId: m.parentId && idMap.has(m.parentId) ? idMap.get(m.parentId)! : null,
		role: m.role,
		content: m.content,
		model: m.model,
		createdAt: m.createdAt,
		...(m.reasoning ? { reasoning: m.reasoning } : {})
	}));

	const newActiveChildMap: Record<string, string> = {};
	for (const [parentKey, childId] of Object.entries(source.activeChildMap)) {
		const newParentKey =
			parentKey === 'root' ? 'root' : idMap.has(parentKey) ? idMap.get(parentKey)! : null;
		const newChildId = idMap.get(childId);
		if (newParentKey && newChildId) {
			newActiveChildMap[newParentKey] = newChildId;
		}
	}

	const conversation: Conversation = {
		id: newConvId,
		title: `Fork of ${source.title}`,
		model: source.model,
		tailId: idMap.get(atMessageId) ?? null,
		activeChildMap: mode === 'active-path' ? {} : newActiveChildMap,
		createdAt: now,
		updatedAt: now,
		autoTitlePending: false
	};

	return { conversation, messages };
}
