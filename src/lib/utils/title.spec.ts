import { describe, it, expect } from 'vitest';
import { sanitizeTitle, makePreliminaryTitle, DEFAULT_TITLE } from './title';

describe('sanitizeTitle', () => {
	it('trims and collapses whitespace', () => {
		expect(sanitizeTitle('  hello   world  ')).toBe('hello world');
	});

	it('strips wrapping ASCII quotes', () => {
		expect(sanitizeTitle('"quoted title"')).toBe('quoted title');
		expect(sanitizeTitle("'singled'")).toBe('singled');
	});

	it('strips wrapping CJK quotes', () => {
		expect(sanitizeTitle('「日本語タイトル」')).toBe('日本語タイトル');
		expect(sanitizeTitle('《书名》')).toBe('书名');
	});

	it('strips trailing punctuation', () => {
		expect(sanitizeTitle('Hello world.')).toBe('Hello world');
		expect(sanitizeTitle('Question?')).toBe('Question');
		expect(sanitizeTitle('题目。')).toBe('题目');
	});

	it('truncates to 60 chars with ellipsis', () => {
		const long = 'a'.repeat(80);
		const result = sanitizeTitle(long);
		expect(result.length).toBe(61); // 60 chars + …
		expect(result.endsWith('…')).toBe(true);
	});

	it('leaves a clean short title alone', () => {
		expect(sanitizeTitle('Deploying to Vercel')).toBe('Deploying to Vercel');
	});
});

describe('makePreliminaryTitle', () => {
	it('returns DEFAULT_TITLE for empty / whitespace input', () => {
		expect(makePreliminaryTitle('')).toBe(DEFAULT_TITLE);
		expect(makePreliminaryTitle('   ')).toBe(DEFAULT_TITLE);
	});

	it('collapses whitespace inside the message', () => {
		expect(makePreliminaryTitle('hello\n\nworld\t!')).toBe('hello world !');
	});

	it('returns short input unchanged after normalization', () => {
		expect(makePreliminaryTitle('What is Svelte?')).toBe('What is Svelte?');
	});

	it('truncates long input to 50 chars with ellipsis', () => {
		const long = 'x'.repeat(80);
		const result = makePreliminaryTitle(long);
		expect(result.length).toBe(51); // 50 chars + …
		expect(result.endsWith('…')).toBe(true);
	});
});
