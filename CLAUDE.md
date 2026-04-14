# CLAUDE.md

## Overview

ChatGPT-like AI chatbot built with SvelteKit + Svelte 5 (runes mode). All models accessed via OpenRouter. No backend database — localStorage only. BYOK (Bring Your Own Key) auth model.

## Tech Stack

- **Framework**: SvelteKit 2 + Svelte 5 (runes mode forced in `svelte.config.js`)
- **UI**: shadcn-svelte + bits-ui + Lucide icons + TailwindCSS 4
- **AI**: Vercel AI SDK (`ai`) + `@openrouter/ai-sdk-provider`
- **Markdown**: `marked` (GFM) + `highlight.js` + `dompurify`
- **Storage**: localStorage (conversations, messages, API key, theme)
- **Testing**: Vitest + Playwright (browser tests: `*.svelte.spec.ts`, server tests: `*.spec.ts`)
- **Package manager**: pnpm

## Project Structure

```
src/
├── routes/
│   ├── +layout.svelte              # Root layout (hljs stylesheet swap)
│   ├── api/chat/+server.ts         # POST: NDJSON streaming AI response
│   ├── api/title/+server.ts        # POST: auto-generate conversation title
│   └── (chat)/
│       ├── +layout.svelte          # Sidebar + main flex shell (responsive)
│       ├── +page.svelte            # Landing page (new conversation)
│       └── chat/[conversationId]/
│           └── +page.svelte        # Conversation view + fork dialog
├── lib/
│   ├── types.ts                    # Message, Conversation, Role
│   ├── config/models.ts            # MODELS list, DEFAULT_MODEL
│   ├── stores/
│   │   ├── chatStore.svelte.ts     # Main reactive store (all CRUD + streaming)
│   │   ├── theme.svelte.ts         # Light/dark theme toggle
│   │   └── persistence.ts          # localStorage I/O helpers
│   ├── utils/
│   │   ├── message-tree.ts         # getActivePath, getSiblings, getLeafDescendant
│   │   ├── markdown.ts             # renderMarkdown (marked + hljs + DOMPurify)
│   │   ├── search.ts               # searchConversations (pure function)
│   │   └── export.ts               # downloadConversationJSON
│   └── components/
│       ├── Sidebar.svelte          # Conversation list, search, settings, theme
│       ├── ConversationListItem.svelte
│       ├── ConversationMenu.svelte # Three-dot menu (rename + delete)
│       ├── ChatMessage.svelte      # User/assistant bubbles with markdown
│       ├── ChatInput.svelte        # Textarea + send/stop
│       ├── ModelSwitcher.svelte    # Model dropdown
│       ├── OpenRouterLogo.svelte   # Inline SVG
│       └── ui/                     # shadcn-svelte primitives (do not edit manually)
```

## Data Model

Conversations use a **message tree** (not flat array). Each message has `parentId` for tree structure. `Conversation.tailId` points to the current leaf; visible path = walk up from tailId. `activeChildMap` tracks branch selections at fork points.

## Key Conventions

- **Svelte 5 runes everywhere**. `$state`, `$derived`, `$effect`, `$props()`. No legacy syntax.
- **`.svelte.ts`** for non-component rune files (stores, utilities).
- **Route IDs include route groups**: use `resolve('/(chat)/chat/[conversationId]', ...)` not `/chat/[conversationId]`.
- **SSR is disabled**: `export const ssr = false` in `(chat)/+layout.ts`.
- **`{@html}` only safe on `renderMarkdown` output** (DOMPurify-sanitized). Mark with eslint-disable + comment.
- **`$app/state`** (not deprecated `$app/stores`).
- **Don't write file comments** explaining WHAT code does. Only non-obvious WHY.
- **shadcn `ui/` components** are generated — don't edit them manually.

## Streaming Protocol

`/api/chat` returns NDJSON (newline-delimited JSON). Each line: `{type: 'text'|'reasoning'|'error', ...}`. Client accumulates deltas into message content/reasoning via `patchMessage`.

## Commands

- `pnpm dev` — dev server (port 5173)
- `pnpm build` — production build
- `pnpm check` — svelte-check + types
- `pnpm lint` — prettier + eslint
- `pnpm test` — vitest (server + client browser projects)
- `pnpm format` — prettier --write

## Env

`.env` needs `OPENROUTER_API_KEY=...` for dev (fallback when BYOK header missing).

## Svelte MCP Server

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation.

- Use `list-sections` FIRST to find relevant docs
- Use `get-documentation` to fetch specific documentation
- ALWAYS use `svelte-autofixer` after writing or modifying Svelte code
- Keep calling autofixer until no issues remain
