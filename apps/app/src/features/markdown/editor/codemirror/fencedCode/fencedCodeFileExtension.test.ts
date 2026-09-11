import { describe, expect, it } from 'vitest';

import { resolveFileExtension } from './fencedCodeFileExtension';

describe('resolveFileExtension', () => {
  it.each([
    ['js', '.js'],
    ['javascript', '.js'],
    ['jsx', '.jsx'],
    ['ts', '.ts'],
    ['typescript', '.ts'],
    ['tsx', '.tsx'],
    ['json', '.json'],
    ['css', '.css'],
    ['html', '.html'],
    ['py', '.py'],
    ['python', '.py'],
    ['yaml', '.yaml'],
    ['yml', '.yaml'],
    ['xml', '.xml'],
    ['sql', '.sql'],
    ['sh', '.sh'],
    ['bash', '.sh'],
    ['zsh', '.sh'],
    ['c', '.c'],
    ['cpp', '.cpp'],
    ['java', '.java'],
    ['go', '.go'],
    ['rust', '.rs'],
  ])('resolves the alias %s to %s', (alias, extension) => {
    expect(resolveFileExtension(alias)).toBe(extension);
  });

  it('is case-insensitive, matching the same info string however it was typed', () => {
    expect(resolveFileExtension('JS')).toBe('.js');
    expect(resolveFileExtension('Python')).toBe('.py');
  });

  it('matches the canonical display name too, not just its lowercase alias', () => {
    expect(resolveFileExtension('JavaScript')).toBe('.js');
    expect(resolveFileExtension('TypeScript')).toBe('.ts');
  });

  it('ignores anything after the language token, matching the same info-string normalization every other fenced-code lookup uses', () => {
    expect(resolveFileExtension('js title="example"')).toBe('.js');
  });

  it('falls back to .txt for an empty info string (no language at all)', () => {
    expect(resolveFileExtension('')).toBe('.txt');
    expect(resolveFileExtension('   ')).toBe('.txt');
  });

  it('falls back to .txt for an unrecognized/unsupported language', () => {
    expect(resolveFileExtension('brainfuck')).toBe('.txt');
    expect(resolveFileExtension('cobol')).toBe('.txt');
  });
});
