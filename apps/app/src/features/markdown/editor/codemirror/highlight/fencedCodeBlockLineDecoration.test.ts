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

  it('a multi-line block marks exactly its own opening line --first, closing line --last, and interior lines as neither', () => {
    const view = mountView(['```js', 'const a = 1;', 'const b = 2;', '```'].join('\n'));
    expect(edgeMarks(view)).toEqual(['first', 'middle', 'middle', 'last']);
  });

  it('a single-line-body block marks its one line both --first and --last', () => {
    const view = mountView(['```js', 'x', '```'].join('\n'));
    expect(edgeMarks(view)).toEqual(['first', 'middle', 'last']);
  });

  it('two back-to-back fenced blocks with NO blank line between them each get their own --first/--last pair, not one merged run', () => {
    // Legal Markdown: CommonMark requires no separator between a closing
    // fence and an immediately following opening fence. The corner-
    // rounding technique this replaced (pure CSS sibling adjacency) could
    // not distinguish this from one continuous eight-line block; per-node
    // identity here must.
    const view = mountView(
      ['```js', 'one', '```', '```py', 'two', '```', '```', 'three', '```'].join('\n')
    );

    expect(edgeMarks(view)).toEqual([
      'first',
      'middle',
      'last',
      'first',
      'middle',
      'last',
      'first',
      'middle',
      'last',
    ]);
  });

  it('three adjacent blocks each get an independent DOM class boundary usable for independent CSS containers', () => {
    const view = mountView(['```', 'a', '```', '```', 'b', '```', '```', 'c', '```'].join('\n'));
    const lines = Array.from(view.dom.querySelectorAll('.cm-line'));

    // Every third line (index 0, 3, 6) is a true block start; every line
    // two after it (index 2, 5, 8) is a true block end — verified via the
    // class list directly, not merely inferred from doc structure.
    [0, 3, 6].forEach((i) => expect(lines[i]!.classList.contains('cm-code-block-line--first')).toBe(true));
    [2, 5, 8].forEach((i) => expect(lines[i]!.classList.contains('cm-code-block-line--last')).toBe(true));
    // And no line is spuriously marked both --last and --first except the
    // true single-line edges of each of these 3-line blocks — line 2
    // (end of block 1) must NOT also be marked --first (which the old
    // adjacency techique had no way to prevent from being confused with
    // block 2's own line 3 immediately following it).
    expect(lines[2]!.classList.contains('cm-code-block-line--first')).toBe(false);
    expect(lines[3]!.classList.contains('cm-code-block-line--last')).toBe(false);
  });
});
