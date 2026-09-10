import type { SyntaxNode } from '@lezer/common';
import { describe, expect, it } from 'vitest';

import { markdownLanguageExtension } from '../markdownLanguage';

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
