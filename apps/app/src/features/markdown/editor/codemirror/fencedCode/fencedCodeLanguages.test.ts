import type { SyntaxNode } from '@lezer/common';
import { describe, expect, it } from 'vitest';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

/**
 * Pure parser-level tests for `codeLanguages` — no `EditorView`, no DOM.
 *
 * The nested tree `parseCode`/`parseMixed` produces is attached as an
 * *overlay* mount (`NodeProp.mounted`) on the enclosing `FencedCode` node,
 * not spliced into the outer tree's ordinary parent/child links — a plain
 * top-down `Tree.iterate()` walk does not descend into it (confirmed
 * directly against `@lezer/common`'s `nextChild`, which only substitutes
 * mounted trees for the non-overlay case). `resolveInner(pos, side)` does
 * enter overlays — it's the same position-resolving path
 * `@lezer/highlight`'s own `highlightTree` uses internally to switch
 * highlighters at a mount boundary — so these tests resolve at a concrete
 * position inside the fenced body and read the ancestor chain from there,
 * rather than asserting node names show up in a flat tree walk.
 */

function ancestorNamesAt(text: string, pos: number): string[] {
  const language = markdownLanguageExtension().language;
  const names: string[] = [];
  let node: SyntaxNode | null = language.parser.parse(text).resolveInner(pos, 1);
  for (; node; node = node.parent) {
    names.push(node.name);
  }
  return names;
}

function nodeNames(text: string): string[] {
  const language = markdownLanguageExtension().language;
  const names: string[] = [];
  language.parser.parse(text).iterate({
    enter(node) {
      names.push(node.name);
    },
  });
  return names;
}

const jsFence = ['```js', 'const greeting = "Hello";', 'console.log(greeting);', '```'].join(
  '\n'
);

describe('fenced code — codeLanguages nested parsing', () => {
  it('parses a fenced block as FencedCode with CodeMark/CodeInfo/CodeText children', () => {
    const names = nodeNames(jsFence);
    expect(names).toContain('FencedCode');
    expect(names).toContain('CodeMark');
    expect(names).toContain('CodeInfo');
    expect(names).toContain('CodeText');
  });

  it('`js` resolves to the JavaScript nested parser — a position inside the fence resolves through real JS nodes, not plain text', () => {
    const pos = jsFence.indexOf('greeting') + 1;
    const names = ancestorNamesAt(jsFence, pos);
    expect(names).toContain('VariableDeclaration');
    expect(names).toContain('FencedCode');
  });

  it('the `javascript` alias resolves the same as `js`', () => {
    const text = ['```javascript', 'const x = 1;', '```'].join('\n');
    const names = ancestorNamesAt(text, text.indexOf('x = 1'));
    expect(names).toContain('VariableDeclaration');
  });

  it('`ts` resolves to the TypeScript nested parser (type annotations parse, not just plain JS)', () => {
    const text = ['```ts', 'const x: number = 1;', '```'].join('\n');
    const names = ancestorNamesAt(text, text.indexOf('number'));
    expect(names).toContain('TypeAnnotation');
  });

  it('`py` resolves to the Python nested parser', () => {
    const text = ['```py', 'def greet():', '    return "hi"', '```'].join('\n');
    const names = ancestorNamesAt(text, text.indexOf('greet'));
    expect(names).toContain('FunctionDefinition');
  });

  it('`jsx` resolves to its own JSX-capable nested parser (JSX elements parse, not just plain JS)', () => {
    const text = ['```jsx', 'const el = <div className="x">hi</div>;', '```'].join('\n');
    const names = ancestorNamesAt(text, text.indexOf('div'));
    expect(names).toContain('JSXElement');
    expect(names).toContain('FencedCode');
  });

  it('`tsx` resolves to its own JSX+TypeScript-capable nested parser', () => {
    const text = [
      '```tsx',
      'const el: JSX.Element = <div className="x">hi</div>;',
      '```',
    ].join('\n');
    const names = ancestorNamesAt(text, text.indexOf('div'));
    expect(names).toContain('JSXElement');
    expect(names).toContain('FencedCode');
  });

  it('plain `js` still parses embedded JSX correctly — JavaScript stays permissive, unlike @codemirror/language-data', () => {
    const text = ['```js', 'const el = <div>hi</div>;', '```'].join('\n');
    const names = ancestorNamesAt(text, text.indexOf('div'));
    expect(names).toContain('JSXElement');
  });

  it('plain `ts` still parses embedded TSX/JSX correctly', () => {
    const text = ['```ts', 'const el = <div>hi</div>;', '```'].join('\n');
    const names = ancestorNamesAt(text, text.indexOf('div'));
    expect(names).toContain('JSXElement');
  });

  it('an unknown language leaves CodeText unmounted — no nested tree, no crash', () => {
    const text = ['```not-a-real-language', 'whatever content', '```'].join('\n');
    const names = nodeNames(text);
    expect(names).toContain('FencedCode');
    expect(names).toContain('CodeText');
    // resolving inside the body lands directly on CodeText/FencedCode —
    // no nested-language ancestor was mounted for an unrecognized info string.
    const ancestors = ancestorNamesAt(text, text.indexOf('whatever'));
    expect(ancestors[0]).toBe('CodeText');
  });

  it('a fenced block with no info string still parses as plain FencedCode/CodeText', () => {
    const names = nodeNames(['```', 'plain text, no language', '```'].join('\n'));
    expect(names).toContain('FencedCode');
    expect(names).toContain('CodeText');
    expect(names).not.toContain('CodeInfo');
  });

  describe('first expansion batch — lazy languages, resolve to their own real nested parser once loaded', () => {
    /**
     * `.load()` must be awaited before parsing here — unlike an
     * `EditorView`-mounted document, a raw `.parser.parse()` call has no
     * active `ParseContext` to schedule a reparse from once a lazy
     * language's dynamic import resolves; `getCodeParser` would otherwise
     * take the `ParseContext.getSkippingParser` branch and leave the block
     * unmounted, indistinguishable from an unrecognized language. Real
     * editor mounts don't need this — `fencedCodeHighlighting.ts`'s own
     * loader (`ensureVisibleLanguagesLoaded`) triggers and reacts to the
     * same `.load()` call natively; see its lazy-loading test suite.
     */
    it.each([
      ['YAML', 'yaml', 'name: test\ncount: 42\nitems:\n  - one\n  - two', 'count', 'BlockMapping'],
      ['XML', 'xml', '<root attr="1"><child>text</child></root>', 'child', 'Element'],
      ['SQL', 'sql', 'SELECT id, name FROM users WHERE id = 1;', 'FROM', 'Statement'],
      [
        'Shell',
        'sh',
        'echo "hello"\nif [ -z "$x" ]; then echo empty; fi',
        'echo',
        'variableName.standard',
      ],
      ['C', 'c', 'int main() { return 0; }', 'main', 'FunctionDefinition'],
      ['C++', 'cpp', 'class Foo { public: int x; };', 'Foo', 'ClassSpecifier'],
      ['Java', 'java', 'class Foo { void bar() { return; } }', 'bar', 'MethodDeclaration'],
      ['Go', 'go', 'func main() { return }', 'main', 'FunctionDecl'],
      ['Rust', 'rust', 'fn main() { let x = 1; }', 'main', 'FunctionItem'],
    ] satisfies [string, string, string, string, string][])(
      '`%s` resolves to a real %s node, not plain CodeText',
      async (name, fence, code, needle, expectedNode) => {
        const description = fencedCodeLanguageDescriptions.find((d) => d.name === name)!;
        await description.load();

        const text = ['```' + fence, code, '```'].join('\n');
        const ancestors = ancestorNamesAt(text, text.indexOf(needle));
        expect(ancestors).toContain(expectedNode);
        expect(ancestors).toContain('FencedCode');
      }
    );

    it('a lazy language\'s alias resolves the same as its canonical name (YAML\'s `yml`)', async () => {
      const description = fencedCodeLanguageDescriptions.find((d) => d.name === 'YAML')!;
      await description.load();

      const text = ['```yml', 'key: value', '```'].join('\n');
      expect(ancestorNamesAt(text, text.indexOf('value'))).toContain('BlockMapping');
    });

    it('C and C++ share the same underlying parser but remain separately selectable identities', () => {
      const c = fencedCodeLanguageDescriptions.find((d) => d.name === 'C')!;
      const cpp = fencedCodeLanguageDescriptions.find((d) => d.name === 'C++')!;
      expect(c).not.toBe(cpp);
      expect(c.alias).not.toContain('cpp');
      expect(cpp.alias).toContain('cpp');
    });
  });

  it('Markdown outside the fenced block is unaffected', () => {
    const doc = ['# Heading', '', jsFence, '', '- a list item', '[[WikiLink]]'].join('\n');
    const names = nodeNames(doc);
    expect(names).toContain('ATXHeading1');
    expect(names).toContain('BulletList');
    expect(names).toContain('WikiLink');
    expect(names).toContain('FencedCode');

    const jsAncestors = ancestorNamesAt(doc, doc.indexOf('greeting') + 1);
    expect(jsAncestors).toContain('VariableDeclaration');
  });
});
