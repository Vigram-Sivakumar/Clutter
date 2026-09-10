// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeBlockLineDecoration } from './fencedCodeBlockLineDecoration';

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [markdownLanguageExtension(), fencedCodeBlockLineDecoration()],
  });
  return new EditorView({ state, parent });
}

function lineClasses(view: EditorView): string[] {
  return Array.from(view.dom.querySelectorAll('.cm-line')).map((line) =>
    line.classList.contains('cm-code-block-line') ? 'code' : 'plain'
  );
}

describe('fencedCodeBlockLineDecoration', () => {
  it('applies the class to every physical line of a multi-line fence, and no others', () => {
    const view = mountView(
      ['before', '```js', 'const a = 1;', 'const b = 2;', '```', 'after'].join('\n')
    );

    expect(lineClasses(view)).toEqual(['plain', 'code', 'code', 'code', 'code', 'plain']);
  });

  it('includes a genuinely blank interior line as part of the block', () => {
    const view = mountView(['```', 'line one', '', 'line two', '```'].join('\n'));

    expect(lineClasses(view)).toEqual(['code', 'code', 'code', 'code', 'code']);
  });

  it('a single-line-body fence gets the class on all three of its lines', () => {
    const view = mountView(['```js', 'x', '```'].join('\n'));
    expect(lineClasses(view)).toEqual(['code', 'code', 'code']);
  });

  it('two separate fenced blocks each get their own class, with plain text between unaffected', () => {
    const view = mountView(['```', 'one', '```', '', 'between', '', '```', 'two', '```'].join('\n'));

    expect(lineClasses(view)).toEqual([
      'code',
      'code',
      'code',
      'plain',
      'plain',
      'plain',
      'code',
      'code',
      'code',
    ]);
  });

  it('does not throw for an unclosed fence at document end', () => {
    expect(() => mountView(['before', '```js', 'const x = 1;'].join('\n'))).not.toThrow();
  });
});
