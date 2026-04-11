# AI Chatbot - Project Plan

## Overview
Build a ChatGPT-like AI chatbot web application using SvelteKit + Svelte 5.

## Tech Stack
- **Framework**: SvelteKit (Svelte 5, runes mode)
- **UI Library**: shadcn-svelte (v5)
- **AI SDK**: Vercel AI SDK (`ai` + `@openrouter/ai-sdk-provider`) — all models are accessed through OpenRouter
- **Model list**: only free-tier OpenRouter models (`:free` suffix)
- **Markdown**: `marked` + `highlight.js` for code syntax highlighting + `dompurify` for sanitization
- **Storage**: localStorage (conversations, messages, user API key)
- **Auth**: none — BYOK model. No user accounts. Each browser is implicitly one user.
- **Key handling**: `/api/chat` reads the OpenRouter key from the `x-openrouter-key` header first, falling back to `OPENROUTER_API_KEY` env var. A Settings UI to configure the key in the browser will be added later; during initial dev we rely on the env fallback.
- **Deployment**: Vercel

## Data Model

The core data structure is a **message tree**, not a flat array. The tree shape is kept for future fork extensibility, but the current UX only walks a single linear path.

```ts
interface Message {
  id: string                   // nanoid
  conversationId: string
  parentId: string | null      // null = root message
  role: 'user' | 'assistant'
  content: string
  model: string                // e.g. 'claude-sonnet-4-20250514'
  createdAt: number
}

interface Conversation {
  id: string
  title: string
  model: string                // current default model for this conversation
  tailId: string | null        // current leaf — the visible path is obtained by walking parentIds up from here
  createdAt: number
  updatedAt: number
}
```

### Tree Logic (current minimal UX)

- A conversation's visible messages = walk `parentId` up from `tailId` to the root, then reverse.
- The **navigator** only appears on the current tail message, and only when the tail has siblings (same `parentId`). It switches `tailId` between those siblings.
- **Regenerate last assistant**: create a new assistant message with the same `parentId` as the current tail → becomes a tail sibling. Update `tailId` to the new message.
- **Edit last user message**: create a new user message sharing the old user's `parentId`, then generate a new assistant as its child. `tailId` points to the new assistant. Because the new branch roots at a different user node, all prior regen siblings of the old assistant fall off the active path automatically (effectively discarded from view, still present in storage).
- **Historical user messages are not editable** in the current UX.

### Future fork extensibility (not built now)

The tree structure + parentId already supports fork. To enable it later we only need to add an optional `activeChildMap: Record<string, string>` on `Conversation`, and upgrade `getActivePath` to walk down from root picking the mapped child at each level. Existing conversations can be migrated on first load by deriving an initial `activeChildMap` from `tailId`.

## Architecture

```
src/
├── routes/
│   ├── +layout.svelte              # Shell: sidebar + main area
│   ├── +page.svelte                # Chat view (reads conversationId from store)
│   └── api/chat/+server.ts         # POST: streaming AI response
├── lib/
│   ├── stores/
│   │   ├── conversations.ts        # Conversation CRUD, list, active conversation
│   │   ├── messages.ts             # Message CRUD, tree operations
│   │   └── persistence.ts          # localStorage read/write helpers
│   ├── utils/
│   │   ├── message-tree.ts         # Pure functions: getActivePath, getSiblings, insertBranch
│   │   ├── search.ts               # Full-text search across all conversations
│   │   └── export.ts               # JSON export (Blob + download)
│   ├── components/
│   │   ├── Sidebar.svelte          # Conversation list + new/delete + search input
│   │   ├── ChatMessage.svelte      # Single message bubble with markdown rendering
│   │   │                           #   - Edit button (user messages)
│   │   │                           #   - Regenerate button (assistant messages)
│   │   ├── ChatInput.svelte        # Text input + send button + model selector dropdown
│   │   ├── MessageNavigator.svelte # Sibling navigation: ← 2/3 →
│   │   ├── SearchDialog.svelte     # Search modal across conversations
│   │   └── ModelSelector.svelte    # Dropdown to switch model mid-conversation
│   └── config/
│       └── models.ts               # Available models list with display names
```

## API Endpoint: `/api/chat`

```ts
// POST body:
{
  messages: { role: string, content: string }[],  // the active path messages
  model: string                                    // model identifier
}

// Response: streaming text (Vercel AI SDK streamText)
```

Use `@ai-sdk/anthropic` provider. The endpoint receives the active message path (already resolved by the client from the tree).

## Features Checklist

### Core
- [ ] Chat with streaming AI responses
- [ ] Create / switch / delete conversations
- [ ] Markdown rendering with code syntax highlighting
- [ ] Persist conversations in localStorage

### Extended
- [ ] Export conversation as .json
- [ ] Search across all conversations
- [ ] Regenerate assistant response (creates sibling branch)
- [ ] Edit past user messages (creates sibling branch + new response)
- [ ] Switch models mid-conversation (per-message model tracking)

## Implementation Order

1. SvelteKit project setup + shadcn-svelte + dependencies
2. Data stores + persistence (conversations, messages, localStorage)
3. message-tree.ts pure functions + tests
4. Basic chat UI (input, message list, sidebar)
5. API endpoint with streaming
6. Markdown rendering
7. Edit / regenerate / sibling navigation
8. Model switching
9. Search
10. Export
11. Polish UI + responsive design