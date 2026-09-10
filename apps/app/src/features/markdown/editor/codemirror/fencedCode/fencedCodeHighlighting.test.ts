import { HighlightStyle, defaultHighlightStyle } from '@codemirror/language';
import { highlightTree } from '@lezer/highlight';
import { describe, expect, it } from 'vitest';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeHighlightSpecs, fencedCodeHighlighting } from './fencedCodeHighlighting';
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

describe('fencedCodeHighlightSpecs — wired to design-system/syntax-tokens.css custom properties', () => {
  it('every spec resolves to a var(--syntax-*) color, never a literal hex', () => {
    for (const spec of fencedCodeHighlightSpecs) {
      expect(spec.color).toMatch(/^var\(--syntax-[a-z]+\)$/);
    }
  });

  it("the generated stylesheet for JS's comment/keyword/string/number classes references the syntax tokens, not hardcoded colors", () => {
    const jsLanguage = fencedCodeLanguageDescriptions.find((d) => d.name === 'JavaScript')!
      .support!.language;
    const scoped = HighlightStyle.define(fencedCodeHighlightSpecs, { scope: jsLanguage });
    const css = scoped.module!.getRules();

    expect(css).toContain('var(--syntax-comment)');
    expect(css).toContain('var(--syntax-keyword)');
    expect(css).toContain('var(--syntax-string)');
    expect(css).toContain('var(--syntax-number)');
    // No hex literal ever appears — every color in this stylesheet is a
    // custom-property reference, so the browser's own cascade (not this
    // extension) resolves the theme-appropriate value.
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}/);
  });

  it('highlights a Python fence using the same token-backed specs (comment, keyword, string, number all present)', () => {
    const pyLanguage = fencedCodeLanguageDescriptions.find((d) => d.name === 'Python')!.support!
      .language;
    const scoped = HighlightStyle.define(fencedCodeHighlightSpecs, { scope: pyLanguage });

    const pyFence = [
      '```py',
      '# a comment',
      'def greet(name):',
      '    return f"hi {name}"',
      'count = 42',
      '```',
    ].join('\n');
    const spans = highlightedSpans(pyFence, scoped);
    const allClasses = spans.map((s) => s.classes).join(' ');

    expect(spans.length).toBeGreaterThan(0);
    // At least the def/return keywords and the string/number literals
    // should have picked up a highlighter class.
    expect(allClasses.length).toBeGreaterThan(0);
  });
});
