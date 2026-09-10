import { describe, expect, it } from 'vitest';

import { friendlyLanguageLabel } from './fencedCodeLanguageLabel';

describe('friendlyLanguageLabel', () => {
  it('maps canonical and aliased names to their friendly label', () => {
    expect(friendlyLanguageLabel('js')).toBe('JavaScript');
    expect(friendlyLanguageLabel('javascript')).toBe('JavaScript');
    // JSX/TSX are first-class identities, not JavaScript/TypeScript aliases
    // — a fence labeled `jsx`/`tsx` displays as its own language, not the
    // one it happens to share a parser with.
    expect(friendlyLanguageLabel('jsx')).toBe('JSX');
    expect(friendlyLanguageLabel('ts')).toBe('TypeScript');
    expect(friendlyLanguageLabel('tsx')).toBe('TSX');
    expect(friendlyLanguageLabel('json')).toBe('JSON');
    expect(friendlyLanguageLabel('css')).toBe('CSS');
    expect(friendlyLanguageLabel('html')).toBe('HTML');
    expect(friendlyLanguageLabel('py')).toBe('Python');
    expect(friendlyLanguageLabel('python')).toBe('Python');
  });

  it('is case-insensitive', () => {
    expect(friendlyLanguageLabel('JS')).toBe('JavaScript');
    expect(friendlyLanguageLabel('Python')).toBe('Python');
  });

  it('strips anything after whitespace, matching codeLanguages own normalization', () => {
    expect(friendlyLanguageLabel('js title="example.js"')).toBe('JavaScript');
  });

  it('falls back to the raw, trimmed text for an unrecognized language', () => {
    expect(friendlyLanguageLabel('not-a-real-language')).toBe('not-a-real-language');
    expect(friendlyLanguageLabel('  rust  ')).toBe('rust');
  });

  it('returns null for an empty or whitespace-only info string', () => {
    expect(friendlyLanguageLabel('')).toBeNull();
    expect(friendlyLanguageLabel('   ')).toBeNull();
  });
});
