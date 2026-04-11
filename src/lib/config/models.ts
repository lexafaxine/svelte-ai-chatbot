export interface ModelOption {
	id: string;
	label: string;
}

export const MODELS: ModelOption[] = [
	{ id: 'deepseek/deepseek-chat-v3.1:free', label: 'DeepSeek V3.1 (free)' },
	{ id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
	{ id: 'google/gemini-2.0-flash-exp:free', label: 'Gemini 2.0 Flash (free)' },
	{ id: 'qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B (free)' }
];

export const DEFAULT_MODEL = MODELS[0].id;
