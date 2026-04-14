export interface ModelOption {
	id: string;
	label: string;
}

export const MODELS: ModelOption[] = [
	{ id: 'deepseek/deepseek-r1', label: 'DeepSeek R1' },
	{ id: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
	{ id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5' },
	{ id: 'openai/o4-mini', label: 'o4-mini' },
	{ id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B (free)' },
	{ id: 'minimax/minimax-m2.5:free', label: 'MiniMax M2.5 (free)' }
];

export const DEFAULT_MODEL = MODELS[0].id;
