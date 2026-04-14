# Svelte AI Chatbot

A ChatGPT-style AI chatbot built with SvelteKit and Svelte 5. All models are accessed through [OpenRouter](https://openrouter.ai/), supporting BYOK (Bring Your Own Key) authentication.

**Live demo:** https://svelte-ai-chatbot-ecru.vercel.app/

## Features

- **Multi-model support** — switch between models (DeepSeek R1 Distill Llama 70B, Nemotron 3, MiniMax M2.5, etc.) mid-conversation
- **Streaming responses** — real-time token streaming with reasoning display for chain-of-thought models
- **Branching conversations** — edit previous messages or regenerate responses to create branches; navigate between branches with sibling controls
- **Fork conversations** — create a new conversation from any point, with active-path or full-history modes
- **Conversation management** — rename, delete, search, and export conversations as JSON
- **Local storage** — all data stays in your browser; nothing is stored on a server
- **Dark mode** — toggle between light and dark themes
- **Keyboard shortcuts** — `⌘K` to search, `⌘⇧O` to start a new chat
- **Installable as a PWA** — ships a web app manifest, so you can install it to your home screen or dock and launch it like a native app

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v10+
- An [OpenRouter API key](https://openrouter.ai/keys)

### Setup

```bash
# Clone the repository
git clone https://github.com/lexafaxine/svelte-ai-chatbot.git
cd svelte-ai-chatbot

# Install dependencies
pnpm install

# Create a .env file with your API key (used as server-side fallback)
echo "OPENROUTER_API_KEY=sk-or-..." > .env

# Start the dev server
pnpm dev
```

The app will be available at http://localhost:5173.

You can also enter your API key directly in the app's settings sidebar — no `.env` file required.

### Note on API Keys

An OpenRouter API key is required to use the chatbot. If you don't have one, please reach out to me and I can provide one for testing.

**Recommendation:** Use a non-free model (e.g. DeepSeek R1 Distill Llama 70B) for testing. Free-tier models have strict rate limits and long queue times, which may result in a poor experience.

### Other Commands

```bash
pnpm build      # Production build
pnpm preview    # Preview production build
pnpm check      # Type checking
pnpm lint       # Lint & format check
pnpm test       # Run tests
```

## Tech Stack

- **Framework:** SvelteKit 2 + Svelte 5 (runes mode)
- **UI:** shadcn-svelte, bits-ui, Lucide icons, TailwindCSS 4
- **AI:** Vercel AI SDK + OpenRouter provider
- **Markdown:** marked (GFM) + highlight.js + DOMPurify
- **Storage:** localStorage (conversations, messages, API key, theme)
