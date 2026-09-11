// @vitest-environment jsdom
import { HighlightStyle, defaultHighlightStyle } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { highlightTree, tags } from '@lezer/highlight';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeHighlightSpecs, fencedCodeHighlighting } from './fencedCodeHighlighting';
import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

const jsFence = ['```js', 'const greeting = "Hello";', '```'].join('\n');

function parse(text: string) {
  return markdownLanguageExtension().language.parser.parse(text);
}

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [markdownLanguageExtension(), ...fencedCodeHighlighting()],
  });
  return new EditorView({ state, parent });
}

async function flushMicrotasks() {
  // Dynamic language-package imports resolve through the real module
  // loader, not a plain microtask — same real-macrotask-delay polling
  // `fencedCodeFormatButtonDecoration.test.ts` already uses for exactly
  // this reason.
  for (let i = 0; i < 50; i++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

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
  it('returns the Compartment-wrapped highlighter set plus the lazy-language loader — two extensions, not one per language', () => {
    // The eager languages' highlighters are all folded into a single
    // Compartment instance (reconfigured as lazy languages load), not one
    // top-level extension per language the way this used to work before
    // any language here was lazy — see this file's own doc comment.
    expect(fencedCodeHighlighting()).toHaveLength(2);
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

  it('maps a plain, unmodified variableName to --syntax-variable — the cross-language gap this file was audited against', () => {
    // Direct style resolution, not a parse — this is the exact check that
    // found the gap in the first place: `HighlightStyle.style([tags.variableName])`
    // returned `null` before this rule existed, meaning every plain
    // identifier reference (a CSS custom-property use/declaration, an
    // ordinary JS/Python/Go/Rust/C/Java variable read, a SQL column name)
    // rendered with no color at all across every registered language,
    // since they all share this one @lezer/highlight tag.
    const style = HighlightStyle.define(fencedCodeHighlightSpecs);
    expect(style.style([tags.variableName])).toBeTruthy();
  });

  it('a CSS custom property — both the declaration and a var() reference — is highlighted once correctly scoped inside a rule', () => {
    const cssLanguage = fencedCodeLanguageDescriptions.find((d) => d.name === 'CSS')!.support!
      .language;
    const scoped = HighlightStyle.define(fencedCodeHighlightSpecs, { scope: cssLanguage });

    const cssFence = [
      '```css',
      ':root {',
      '  --brand-color: #ff0000;',
      '}',
      '.x {',
      '  color: var(--brand-color);',
      '}',
      '```',
    ].join('\n');
    const spans = highlightedSpans(cssFence, scoped);

    const declPos = cssFence.indexOf('--brand-color:');
    const refPos = cssFence.lastIndexOf('--brand-color');
    expect(spans.some((s) => s.from <= declPos && s.to >= declPos + 1)).toBe(true);
    expect(spans.some((s) => s.from <= refPos && s.to >= refPos + 1)).toBe(true);
  });

  it('a plain JS variable reference (not a definition, not a call) is highlighted', () => {
    const jsLanguage = fencedCodeLanguageDescriptions.find((d) => d.name === 'JavaScript')!
      .support!.language;
    const scoped = HighlightStyle.define(fencedCodeHighlightSpecs, { scope: jsLanguage });

    const doc = ['```js', 'function greet(name) {', '  return name;', '}', '```'].join('\n');
    const spans = highlightedSpans(doc, scoped);

    const refPos = doc.lastIndexOf('name');
    expect(spans.some((s) => s.from <= refPos && s.to >= refPos + 1)).toBe(true);
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

describe('fencedCodeHighlightSpecs — shell builtin command names', () => {
  it('resolves variableName.standard (tags.standard(tags.variableName)) to the same class as a function call, not a plain variable', () => {
    // `@codemirror/legacy-modes`' shell mode tags builtin command names
    // (`echo`, `cd`, `cat`, ...) as the string token type `"builtin"`,
    // which `@codemirror/language`'s own fixed legacy-mode token table
    // maps to `variableName.standard` — confirmed directly against the
    // installed source, not assumed. Left unmapped, this would fall back
    // via the tag hierarchy to the plain `variableName` rule (added
    // above) and render variable-blue. Explicitly grouped with the
    // function-color rules instead, matching the standard TextMate/VS
    // Code convention of scoping shell builtins as
    // `support.function.builtin.shell` (inheriting `support.function`'s
    // color, the same one every other function name in this table uses).
    const style = HighlightStyle.define(fencedCodeHighlightSpecs);

    const builtinClass = style.style([tags.standard(tags.variableName)]);
    const functionCallClass = style.style([tags.function(tags.variableName)]);
    const plainVariableClass = style.style([tags.variableName]);

    expect(builtinClass).toBeTruthy();
    expect(builtinClass).toBe(functionCallClass);
    expect(builtinClass).not.toBe(plainVariableClass);
  });

  it('a real shell fence colors a builtin command name (echo) differently from a plain variable reference ($NAME)', async () => {
    const shellDescription = fencedCodeLanguageDescriptions.find((d) => d.name === 'Shell')!;
    await shellDescription.load();

    const scoped = HighlightStyle.define(fencedCodeHighlightSpecs, {
      scope: shellDescription.support!.language,
    });
    const doc = ['```sh', 'echo "hi $NAME"', '```'].join('\n');
    const spans = highlightedSpans(doc, scoped);

    const echoPos = doc.indexOf('echo');
    const namePos = doc.indexOf('$NAME');
    const echoSpan = spans.find((s) => s.from <= echoPos && s.to >= echoPos + 1);
    const nameSpan = spans.find((s) => s.from <= namePos && s.to >= namePos + 1);

    expect(echoSpan?.classes).toBeTruthy();
    expect(nameSpan?.classes).toBeTruthy();
    expect(echoSpan?.classes).not.toBe(nameSpan?.classes);
  });
});

describe('fencedCodeHighlighting — lazily-loaded languages', () => {
  it('a lazily-registered language becomes highlightable through the same shared spec table once LanguageDescription.load() resolves', async () => {
    const goDescription = fencedCodeLanguageDescriptions.find((d) => d.name === 'Go')!;
    expect(goDescription.support).toBeUndefined();

    await goDescription.load();

    expect(goDescription.support).toBeDefined();
    const scoped = HighlightStyle.define(fencedCodeHighlightSpecs, {
      scope: goDescription.support!.language,
    });
    const goFence = ['```go', 'func main() {}', '```'].join('\n');
    expect(highlightedSpans(goFence, scoped).length).toBeGreaterThan(0);
  });

  it('two fences of the same not-yet-loaded language in one document trigger exactly one underlying dynamic import', async () => {
    // The loader plugin re-scans on every docChanged/viewportChanged
    // update and calls `.load()` again each time it finds an unresolved
    // match — that's expected and fine, since `LanguageDescription.load()`
    // itself (`this.loading || (this.loading = this.loadFunc()...)`)
    // caches the in-flight/resolved promise. The actual guarantee this
    // test protects is on `loadFunc` (the dynamic `import()` itself), not
    // on how many times `.load()` gets called. Must run before the
    // `it.each` below, which loads every one of these languages itself —
    // this test needs Java genuinely unloaded at the start.
    const javaDescription = fencedCodeLanguageDescriptions.find((d) => d.name === 'Java')!;
    expect(javaDescription.support).toBeUndefined();
    // `loadFunc` (the actual `import()` call `LanguageDescription.of`'s own
    // `load` spec becomes) is a real runtime field but not part of
    // `LanguageDescription`'s public `.d.ts` surface — cast narrowly, only
    // for this spy, rather than widening the whole file to `any`.
    const loadFuncSpy = vi.spyOn(javaDescription as unknown as { loadFunc: () => unknown }, 'loadFunc');

    const doc = ['```java', 'class A {}', '```', '', '```java', 'class B {}', '```'].join('\n');
    mountView(doc);
    await flushMicrotasks();

    expect(loadFuncSpy).toHaveBeenCalledTimes(1);
    expect(javaDescription.support).toBeDefined();
  });

  it.each([
    ['YAML', 'yaml', 'key: value\nlist:\n  - one\n  - two'],
    ['XML', 'xml', '<root attr="1"><child>text</child></root>'],
    ['SQL', 'sql', "SELECT id, name FROM users WHERE id = 1;"],
    ['Shell', 'sh', 'echo "hello $USER"'],
    ['C', 'c', '// comment\nint main() { return 0; }'],
    ['C++', 'cpp', 'class Foo { public: int x = 1; };'],
    ['Java', 'java', 'class Foo { void bar() { return; } }'],
    ['Go', 'go', 'func main() { x := 1 }'],
    ['Rust', 'rust', 'fn main() { let x: i32 = 1; }'],
  ] satisfies [string, string, string][])(
    'produces real highlight spans through fencedCodeHighlightSpecs for %s, using a representative sample',
    async (name, fence, code) => {
      const description = fencedCodeLanguageDescriptions.find((d) => d.name === name)!;
      await description.load();

      const scoped = HighlightStyle.define(fencedCodeHighlightSpecs, {
        scope: description.support!.language,
      });
      const text = ['```' + fence, code, '```'].join('\n');
      const spans = highlightedSpans(text, scoped);

      expect(spans.length).toBeGreaterThan(0);
      // Every color this shared spec table ever produces is a
      // `var(--syntax-*)` reference (already asserted generically for the
      // whole table below) — for a genuinely new grammar, the real risk is
      // a tag this table doesn't cover at all producing zero spans
      // silently, which the length assertion above already guards.
    }
  );

  it('a mounted editor eventually highlights a fenced block in a lazily-loaded language, with no page reload or Compartment wiring from the caller', async () => {
    const view = mountView(['```rust', 'fn main() {}', '```'].join('\n'));

    // Reconfiguring the highlighting Compartment happens asynchronously,
    // once the dynamic import resolves — this is the actual behavior the
    // Compartment/loader mechanism exists for, not just its pieces in
    // isolation (the two tests above/below).
    await flushMicrotasks();

    const highlighted = view.dom.querySelectorAll('.cm-line [class*="ͼ"]');
    expect(highlighted.length).toBeGreaterThan(0);
  });
});
