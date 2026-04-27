import { nanoid } from 'nanoid';
import type { Conversation, Message } from '$lib/types';
import { getChainTo } from './message-tree';

/**
 * How much of the source conversation to copy when forking.
 *
 * - `'active-path'`: only the linear chain from root to the chosen message.
 * - `'full-history'`: every message created at or before the chosen one
 *   (including off-path branches), with `activeChildMap` rewritten so the
 *   new conversation opens on the same branch the user was viewing.
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
 * Build a new conversation + cloned message set from a fork point. Pure: no
 * I/O, no global state, no random side effects beyond `nanoid` and
 * `Date.now()`. Caller is responsible for splicing the result into the store.
 *
 * @param opts.source — the source conversation row.
 * @param opts.sourceMessages — every message belonging to the source.
 * @param opts.atMessageId — message that becomes the new conversation's tip.
 * @param opts.mode — see {@link ForkMode}.
 * @returns the new conversation + cloned messages, or `null` if no messages
 *   would be cloned (e.g. `atMessageId` is unknown).
 */
export function buildFork(opts: BuildForkOpts): BuildForkResult | null {
	const { source, sourceMessages, atMessageId, mode } = opts;

	let toClone: Message[];
	if (mode === 'active-path') {
		toClone = getChainTo(sourceMessages, source.id, atMessageId);
	} else {
		const sourceById = new Map(sourceMessages.map((m) => [m.id, m]));
		const targetTime = sourceById.get(atMessageId)?.createdAt ?? Infinity;
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

	// Start from the source's map (full-history) or empty (active-path),
	// then overwrite the chain from root → cloneOfAtMessage so descent is
	// guaranteed to reach the chosen message.
	const activeChildMap: Record<string, string> = {};
	if (mode === 'full-history') {
		for (const [parentKey, childId] of Object.entries(source.activeChildMap)) {
			const newParentKey = parentKey === 'root' ? 'root' : idMap.get(parentKey);
			const newChildId = idMap.get(childId);
			if (newParentKey && newChildId) {
				activeChildMap[newParentKey] = newChildId;
			}
		}
	}

	const cloneById = new Map(messages.map((m) => [m.id, m]));
	let walker: Message | undefined = cloneById.get(idMap.get(atMessageId)!);
	while (walker) {
		activeChildMap[walker.parentId ?? 'root'] = walker.id;
		walker = walker.parentId ? cloneById.get(walker.parentId) : undefined;
	}

	const conversation: Conversation = {
		id: newConvId,
		title: `Fork of ${source.title}`,
		model: source.model,
		activeChildMap,
		createdAt: now,
		updatedAt: now,
		autoTitlePending: false
	};

	return { conversation, messages };
}
