import { HighlightStyle, defaultHighlightStyle } from '@codemirror/language';
import { highlightTree } from '@lezer/highlight';
import { describe, expect, it } from 'vitest';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeHighlighting } from './fencedCodeHighlighting';
import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

const jsFence = ['```js', 'const greeting = "Hello";', '```'].join('\n');

function parse(text: string) {
  return markdownLanguageExtension().language.parser.parse(text);
}

/**
 * Exercises the exact mechanism `@lezer/highlight`'s own `highlightTree`
 * uses internally to walk a mixed-parse tree (detecting each node's
 * `NodeProp.mounted` overlay and switching highlighters at that boundary,
 * per its own source) — the same code path CM6's `syntaxHighlighting()`
 * extension drives at render time. A `HighlightStyle` instance satisfies
 * `Highlighter` directly, so it can be passed to `highlightTree` without
 * needing a full `EditorState`/`EditorView`.
 */
function highlightedSpans(text: string, highlighter: HighlightStyle): { from: number; to: number; classes: string }[] {
  const spans: { from: number; to: number; classes: string }[] = [];
  highlightTree(parse(text), highlighter, (from, to, classes) => {
    spans.push({ from, to, classes });
  });
  return spans;
}

describe('fencedCodeHighlighting — scoped to nested language trees only', () => {
  it('registers one syntaxHighlighting extension per registered language', () => {
    expect(fencedCodeHighlighting()).toHaveLength(fencedCodeLanguageDescriptions.length);
  });

  it('highlights the JS string literal inside a fenced block (nested parser + highlighter both active)', () => {
    const jsLanguage = fencedCodeLanguageDescriptions.find((d) => d.name === 'JavaScript')!
      .support!.language;
    const scoped = HighlightStyle.define(defaultHighlightStyle.specs, { scope: jsLanguage });

    const spans = highlightedSpans(jsFence, scoped);
    const stringStart = jsFence.indexOf('"Hello"');
    const overlappingString = spans.find(
      (s) => s.from <= stringStart && s.to >= stringStart + '"Hello"'.length
    );
    expect(overlappingString?.classes).toBeTruthy();
  });

  it('does not highlight Markdown heading text — the scoped highlighter never matches the outer Markdown tree', () => {
    const jsLanguage = fencedCodeLanguageDescriptions.find((d) => d.name === 'JavaScript')!
      .support!.language;
    const scoped = HighlightStyle.define(defaultHighlightStyle.specs, { scope: jsLanguage });

    const spans = highlightedSpans('# Heading text', scoped);
    expect(spans).toHaveLength(0);
  });

  it('a Python-scoped highlighter does not fire on a JS fenced block, and vice versa', () => {
    const jsLanguage = fencedCodeLanguageDescriptions.find((d) => d.name === 'JavaScript')!
      .support!.language;
    const pyLanguage = fencedCodeLanguageDescriptions.find((d) => d.name === 'Python')!.support!
      .language;
    const pyScoped = HighlightStyle.define(defaultHighlightStyle.specs, { scope: pyLanguage });
    const jsScoped = HighlightStyle.define(defaultHighlightStyle.specs, { scope: jsLanguage });

    expect(highlightedSpans(jsFence, pyScoped)).toHaveLength(0);

    const pyFence = ['```py', 'def greet():', '    return "hi"', '```'].join('\n');
    expect(highlightedSpans(pyFence, jsScoped)).toHaveLength(0);
    expect(highlightedSpans(pyFence, pyScoped).length).toBeGreaterThan(0);
  });
});
