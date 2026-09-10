// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeBlockLineDecoration } from './fencedCodeBlockLineDecoration';
import { fencedCodeBlockWrapper } from './fencedCodeBlockWrapper';

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [
      markdownLanguageExtension(),
      fencedCodeBlockWrapper(),
      fencedCodeBlockLineDecoration(),
    ],
  });
  return new EditorView({ state, parent });
}

type EdgeMark = 'first' | 'last' | 'both' | 'middle' | 'plain';

function edgeMarks(view: EditorView): EdgeMark[] {
  return Array.from(view.dom.querySelectorAll('.cm-line')).map((line) => {
    if (!line.classList.contains('cm-code-block-line')) {
      return 'plain';
    }
    const first = line.classList.contains('cm-code-block-line--first');
    const last = line.classList.contains('cm-code-block-line--last');
    if (first && last) return 'both';
    if (first) return 'first';
    if (last) return 'last';
    return 'middle';
  });
}

describe('fencedCodeBlockLineDecoration (composed with fencedCodeBlockWrapper)', () => {
  it('applies the visual-card class to every line, and no others', () => {
    const view = mountView(
      ['before', '```js', 'const a = 1;', 'const b = 2;', '```', 'after'].join('\n')
    );

    const marks = edgeMarks(view);
    expect(marks).toEqual(['plain', 'first', 'middle', 'middle', 'last', 'plain']);
  });

  it('a single-line-body block marks its one line both --first and --last', () => {
    const view = mountView(['```js', 'x', '```'].join('\n'));
    expect(edgeMarks(view)).toEqual(['first', 'middle', 'last']);
  });

  it('two back-to-back blocks (no blank line, already two independent blockWrappers) each get their own correct --first/--last pair', () => {
    const view = mountView(['```js', 'one', '```', '```py', 'two', '```'].join('\n'));
    expect(edgeMarks(view)).toEqual(['first', 'middle', 'last', 'first', 'middle', 'last']);
  });

  it('every visually-carded line is a real DOM child of its own .cm-code-block wrapper, never a sibling', () => {
    const view = mountView(['```js', 'one', '```', '```py', 'two', '```'].join('\n'));
    const wrappers = view.dom.querySelectorAll('.cm-code-block');
    expect(wrappers).toHaveLength(2);

    wrappers.forEach((wrapper) => {
      const cardLines = wrapper.querySelectorAll(':scope > .cm-code-block-line');
      expect(cardLines).toHaveLength(3);
    });
  });

  it('includes a genuinely blank interior line as part of the card', () => {
    const view = mountView(['```', 'line one', '', 'line two', '```'].join('\n'));
    expect(edgeMarks(view)).toEqual(['first', 'middle', 'middle', 'middle', 'last']);
  });

  it('does not throw for an unclosed fence at document end', () => {
    expect(() => mountView(['before', '```js', 'const x = 1;'].join('\n'))).not.toThrow();
  });
});
