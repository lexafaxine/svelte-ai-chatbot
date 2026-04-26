# Contributing

Conventions for adding to this codebase. The high-level architecture and tech
stack live in [CLAUDE.md](./CLAUDE.md); this file covers the day-to-day style
choices: how to write JSDoc, how to write tests, and a few other things that
aren't obvious from grepping the code.

## Code style

- **Svelte 5 runes only.** `$state`, `$derived`, `$effect`, `$props()`. No
  legacy stores or `let`-based reactivity.
- **`.svelte.ts` files** for non-component rune modules (stores, reactive
  utilities). Plain `.ts` otherwise.
- **Route IDs include route groups.** Use
  `resolve('/(chat)/chat/[conversationId]', ...)`, not
  `'/chat/[conversationId]'`.
- **`{@html}`** is allowed only on `renderMarkdown` output, since DOMPurify
  sanitizes it. Always pair the usage with both:
  - `// safe: renderMarkdown sanitizes with DOMPurify before returning`
  - `// eslint-disable-next-line svelte/no-at-html-tags`
- **`$app/state`**, not the deprecated `$app/stores`.
- **shadcn-svelte UI primitives** under `src/lib/components/ui/` are
  generated and should not be hand-edited. Re-run `pnpm shadcn-svelte add ...`
  to regenerate.
- **Comments**: don't restate what well-named code already says. Comment the
  reasoning behind hidden constraints, invariants, or workarounds.
- **Browser environment checks.** The app currently runs CSR-only
  (`export const ssr = false`), but for
  robustness and to keep SSR a future option, gate any direct `window` /
  `document` / `localStorage` access behind a `browser` check
  (`import { browser } from '$app/environment'`, or the equivalent
  `typeof window !== 'undefined'` test in plain `.ts` files).

## JSDoc

Public exports (functions, methods on store APIs, types) should carry JSDoc.
Use the formal `@param` / `@returns` shape so IDE hover popups read
consistently.

```ts
/**
 * Reconstruct the visible message thread for a conversation by walking
 * `parentId` from `tailId` up to the root.
 *
 * @param messages the full message list. Only messages reachable from
 *   `tailId` are inspected.
 * @param tailId the tip of the visible branch
 *   ({@link import('$lib/types').Conversation.tailId}), or `null`.
 * @returns the messages on the active path in root-first order. Empty if
 *   `tailId` is `null` or unknown.
 */
export function getActivePath(messages: Message[], tailId: string | null): Message[] { ... }
```

## Tests

Two Vitest projects, configured in `vite.config.ts`:

| Project  | File pattern       | Environment                     |
| -------- | ------------------ | ------------------------------- |
| `client` | `*.svelte.spec.ts` | Browser (Playwright + Chromium) |
| `server` | other `*.spec.ts`  | Node                            |

Pure logic (utilities, store helpers, the `persistence` layer) goes in
`*.spec.ts`. Anything that mounts a Svelte component goes in
`*.svelte.spec.ts`.

### Mocking

When a component imports SvelteKit modules (`$app/navigation`, `$app/state`,
`$app/paths`) or app stores, mock them.

- **Always declare mock objects with `vi.hoisted(...)`** so they're
  guaranteed to exist when the `vi.mock(...)` factory runs.
- **Reset mocks in `beforeEach`** so test order doesn't matter.
- **Import the component after the mocks are wired**, using
  `await import(...)`.

```ts
const gotoMock = vi.hoisted(() => vi.fn());
const pageMock = vi.hoisted(() => ({ params: {} as Record<string, string | undefined> }));
const chatMock = vi.hoisted(() => ({
	deleteConversation: vi.fn(),
	setConversationTitle: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: gotoMock }));
vi.mock('$app/state', () => ({
	get page() {
		return pageMock;
	}
}));
vi.mock('$lib/stores/chatStore.svelte', () => ({
	get chat() {
		return chatMock;
	}
}));

const { default: ConversationMenu } = await import('./ConversationMenu.svelte');

beforeEach(() => {
	gotoMock.mockReset();
	chatMock.deleteConversation.mockReset();
	chatMock.setConversationTitle.mockReset();
	pageMock.params = {};
});
```

### User interaction and queries

Prefer the locator API from `vitest-browser-svelte`:

```ts
const screen = render(ChatInput, { onSubmit });
const textbox = screen.getByRole('textbox');

await textbox.fill('hello');
await screen.getByRole('button', { name: 'Send' }).click();
await expect.element(textbox).toHaveValue('');
```

- **Prefer accessibility-first locators** (`getByRole`, `getByText`) over
  class-name or attribute selectors like
  `screen.container.querySelector('.foo')` or
  `'button[aria-label="X"]'`. Locators survive cosmetic refactors and
  surface real accessibility regressions.
- **Drop down to a raw event** on the located element only when the locator
  API doesn't cover what you need (e.g. `KeyboardEvent` properties like
  `isComposing`).
- **`querySelector` is also acceptable** when the assertion is genuinely
  about a specific HTML semantic tag (`<details>`, `<summary>`,
  `<strong>`) rather than a CSS class. The tag itself is the contract.

## Commands

| Command       | Purpose                             |
| ------------- | ----------------------------------- |
| `pnpm dev`    | Dev server (port 5173)              |
| `pnpm build`  | Production build                    |
| `pnpm check`  | `svelte-kit sync` + `svelte-check`  |
| `pnpm lint`   | `prettier --check` + `eslint`       |
| `pnpm format` | `prettier --write`                  |
| `pnpm test`   | Vitest (both `client` and `server`) |

Run `pnpm check`, `pnpm lint`, and `pnpm test` before pushing.
