export interface ModelOption {
	id: string;
	label: string;
}

export const MODELS: ModelOption[] = [
	{ id: 'deepseek/deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill Llama 70B' },
	{ id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
	{ id: 'minimax/minimax-m2.5:free', label: 'MiniMax M2.5 (free)' }
];

export const DEFAULT_MODEL = MODELS[0].id;
