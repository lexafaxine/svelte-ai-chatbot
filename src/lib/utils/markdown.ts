import { Marked, type Tokens } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

/**
 * HTML-escape the five characters that have meaning in HTML. Used as a
 * safety net when syntax highlighting fails
 *
 * @param s — arbitrary string.
 * @returns the same string with `&`, `<`, `>`, `"`, `'` replaced by entities.
 */
function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		code({ text, lang }: Tokens.Code): string {
			const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
			try {
				const highlighted = hljs.highlight(text, { language, ignoreIllegals: true }).value;
				return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
			} catch {
				return `<pre><code class="hljs">${escapeHtml(text)}</code></pre>`;
			}
		}
	}
});

/**
 * Render a Markdown string to sanitized HTML.
 * @param md — the raw Markdown source. Empty string in → empty string out.
 * @returns sanitized HTML ready for `{@html}`.
 */
export function renderMarkdown(md: string): string {
	if (!md) return '';
	const raw = marked.parse(md) as string;
	return DOMPurify.sanitize(raw);
}
