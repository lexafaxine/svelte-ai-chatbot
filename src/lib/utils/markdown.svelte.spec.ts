import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('returns empty string for empty input', () => {
		expect(renderMarkdown('')).toBe('');
	});

	it('renders basic markdown to HTML', () => {
		const html = renderMarkdown('**bold** and *italic*');
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<em>italic</em>');
	});

	it('renders GFM line breaks (breaks: true)', () => {
		const html = renderMarkdown('line1\nline2');
		expect(html).toContain('<br');
	});

	it('highlights fenced code blocks with hljs classes', () => {
		const html = renderMarkdown('```js\nconst x = 1;\n```');
		expect(html).toContain('class="hljs language-js"');
		expect(html).toContain('<pre>');
	});

	it('falls back to plaintext for unknown languages', () => {
		const html = renderMarkdown('```nosuchlang\nhello\n```');
		expect(html).toContain('class="hljs language-plaintext"');
	});

	it('sanitizes inline script tags via DOMPurify', () => {
		const html = renderMarkdown('hello<script>alert(1)</script>');
		expect(html).not.toContain('<script');
		expect(html).not.toContain('alert(1)');
	});

	it('sanitizes javascript: URLs in links', () => {
		const html = renderMarkdown('[click](javascript:alert(1))');
		expect(html).not.toMatch(/href=['"]javascript:/i);
	});

	it('preserves safe links', () => {
		const html = renderMarkdown('[ok](https://example.com)');
		expect(html).toContain('href="https://example.com"');
	});
});
