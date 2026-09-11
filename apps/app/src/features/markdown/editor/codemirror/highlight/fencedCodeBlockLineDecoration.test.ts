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

  it('an unclosed fence with only the opening/info line marks that line both --first and --last', () => {
    const view = mountView('```css');
    expect(edgeMarks(view)).toEqual(['both']);
  });

  it('an unclosed opening-only fence followed by the document\'s own trailing newline still marks its one real line both --first and --last', () => {
    const view = mountView('```css\n');
    expect(edgeMarks(view)).toEqual(['both', 'plain']);
  });
});

function activeLineTexts(view: EditorView): string[] {
  return Array.from(view.dom.querySelectorAll('.cm-code-block-line--active')).map(
    (line) => line.textContent ?? ''
  );
}

describe('fencedCodeBlockLineDecoration — active line', () => {
  const doc = ['before', '```js', 'const a = 1;', 'const b = 2;', '```', 'after'].join('\n');

  it('marks no line active when the caret is outside any fenced block', () => {
    const view = mountView(doc);
    view.dispatch({ selection: { anchor: 0 } }); // "before"
    expect(activeLineTexts(view)).toEqual([]);
  });

  it('marks exactly the line containing the caret when it is inside a fenced block', () => {
    const view = mountView(doc);
    const secondLineFrom = view.state.doc.line(3).from; // "const a = 1;"
    view.dispatch({ selection: { anchor: secondLineFrom + 2 } });
    expect(activeLineTexts(view)).toEqual(['const a = 1;']);
  });

  it('moves the active line as the caret moves between lines within the same block', () => {
    const view = mountView(doc);
    view.dispatch({ selection: { anchor: view.state.doc.line(3).from } });
    expect(activeLineTexts(view)).toEqual(['const a = 1;']);

    view.dispatch({ selection: { anchor: view.state.doc.line(4).from } });
    expect(activeLineTexts(view)).toEqual(['const b = 2;']);
  });

  it('clears the active line once the caret leaves the block', () => {
    const view = mountView(doc);
    view.dispatch({ selection: { anchor: view.state.doc.line(3).from } });
    expect(activeLineTexts(view)).toEqual(['const a = 1;']);

    view.dispatch({ selection: { anchor: view.state.doc.line(6).from } }); // "after"
    expect(activeLineTexts(view)).toEqual([]);
  });

  it('only marks the block the caret is actually in when multiple blocks are present', () => {
    const twoBlocks = ['```js', 'one', '```', '```py', 'two', '```'].join('\n');
    const view = mountView(twoBlocks);
    view.dispatch({ selection: { anchor: view.state.doc.line(5).from } }); // "two"
    expect(activeLineTexts(view)).toEqual(['two']);
  });

  it('does not mark every line of a multi-line selection — head-only, not range-wide', () => {
    const view = mountView(doc);
    const from = view.state.doc.line(3).from; // "const a = 1;"
    const to = view.state.doc.line(4).to; // "const b = 2;"
    view.dispatch({ selection: { anchor: from, head: to } });
    expect(activeLineTexts(view)).toEqual(['const b = 2;']);
  });
});
