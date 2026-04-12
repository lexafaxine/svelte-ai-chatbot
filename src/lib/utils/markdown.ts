import { Marked, type Tokens } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

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

export function renderMarkdown(md: string): string {
	if (!md) return '';
	const raw = marked.parse(md) as string;
	return DOMPurify.sanitize(raw);
}
