// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { markdownLanguageExtension } from '../markdownLanguage';
import { blockSeparatorDecoration } from './blockSeparatorDecoration';

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [markdownLanguageExtension(), blockSeparatorDecoration()],
  });
  return new EditorView({ state, parent });
}

function separatorCount(view: EditorView): number {
  return view.dom.querySelectorAll('.cm-block-separator').length;
}

describe('blockSeparatorDecoration — boundary ownership', () => {
  it('inserts no separator for a lone image at document start/end', () => {
    const view = mountView('![alt](https://example.com/a.png)');
    expect(separatorCount(view)).toBe(0);
    view.destroy();
  });

  it('inserts a trailing separator for a lone image followed by the document’s own trailing newline (that newline’s own line genuinely exists and is typeable)', () => {
    const view = mountView('![alt](https://example.com/a.png)\n');
    expect(separatorCount(view)).toBe(1);
    view.destroy();
  });

  it('inserts exactly one separator between two images on adjacent lines with no blank line', () => {
    const view = mountView('![a](https://example.com/a.png)\n![b](https://example.com/b.png)');
    expect(separatorCount(view)).toBe(1);
    view.destroy();
  });

  it('inserts exactly one separator between two images separated by a real blank line (blank lines no longer suppress the separator)', () => {
    const view = mountView('![a](https://example.com/a.png)\n\n![b](https://example.com/b.png)');
    expect(separatorCount(view)).toBe(1);
    view.destroy();
  });

  it('inserts exactly one separator between two images separated by several blank lines', () => {
    const view = mountView('![a](https://example.com/a.png)\n\n\n\n![b](https://example.com/b.png)');
    expect(separatorCount(view)).toBe(1);
    view.destroy();
  });

  it('inserts exactly one separator between an image and fenced code with no blank line', () => {
    const view = mountView('![a](https://example.com/a.png)\n```\ncode\n```');
    expect(separatorCount(view)).toBe(1);
    view.destroy();
  });

  it('inserts separators on both sides of an inline image sitting mid-paragraph', () => {
    const view = mountView('before ![alt](https://example.com/a.png) after');
    expect(separatorCount(view)).toBe(2);
    view.destroy();
  });

  it('inserts exactly one separator when fenced code is immediately followed by a plain paragraph', () => {
    const view = mountView('```\ncode\n```\nafter');
    expect(separatorCount(view)).toBe(1);
    view.destroy();
  });

  it('inserts exactly one separator when fenced code is followed by a paragraph across a real blank line', () => {
    const view = mountView('```\ncode\n```\n\nafter');
    expect(separatorCount(view)).toBe(1);
    view.destroy();
  });

  it('inserts exactly N-1 separators across N mixed adjacent participants with no blank lines', () => {
    const view = mountView(
      '![a](https://example.com/a.png)\n```\ncode\n```\n![b](https://example.com/b.png)'
    );
    expect(separatorCount(view)).toBe(2);
    view.destroy();
  });

  it('inserts exactly N-1 separators across N mixed participants even when every boundary has a real blank line', () => {
    const view = mountView(
      '![a](https://example.com/a.png)\n\n```\ncode\n```\n\n![b](https://example.com/b.png)'
    );
    expect(separatorCount(view)).toBe(2);
    view.destroy();
  });

  it('does not affect the stored document text', () => {
    const text = 'before ![alt](https://example.com/a.png) after\n\n```\ncode\n```';
    const view = mountView(text);
    expect(view.state.doc.toString()).toBe(text);
    view.destroy();
  });

  it('updates separators after a structural edit (removing a blank line)', () => {
    const view = mountView('![a](https://example.com/a.png)\n\n![b](https://example.com/b.png)');
    expect(separatorCount(view)).toBe(1);

    const blankLineFrom = view.state.doc.toString().indexOf('\n\n');
    view.dispatch({ changes: { from: blankLineFrom, to: blankLineFrom + 1, insert: '' } });

    expect(separatorCount(view)).toBe(1);
    view.destroy();
  });
});

describe('blockSeparatorDecoration — stability under typing (no jump while editing an existing line)', () => {
  it('separator count is identical whether the line above a block is blank or already has text', () => {
    const blankAbove = mountView('\n![img](https://example.com/a.png)');
    const textAbove = mountView('above\n![img](https://example.com/a.png)');
    expect(separatorCount(blankAbove)).toBe(separatorCount(textAbove));
    blankAbove.destroy();
    textAbove.destroy();
  });

  it('separator count is identical whether the line below a block is blank or already has text', () => {
    const blankBelow = mountView('![img](https://example.com/a.png)\n');
    const textBelow = mountView('![img](https://example.com/a.png)\nbelow');
    expect(separatorCount(blankBelow)).toBe(separatorCount(textBelow));
    blankBelow.destroy();
    textBelow.destroy();
  });

  it('typing into an existing blank line adjacent to a block does not change the separator count', () => {
    const view = mountView('above\n\n![img](https://example.com/a.png)');
    const before = separatorCount(view);

    const blankLineFrom = view.state.doc.toString().indexOf('\n\n') + 1;
    view.dispatch({ changes: { from: blankLineFrom, insert: 'typed while editing' } });

    expect(separatorCount(view)).toBe(before);
    view.destroy();
  });

  it('deleting text back down to an empty line does not change the separator count', () => {
    const view = mountView('some text\n![img](https://example.com/a.png)');
    const before = separatorCount(view);

    view.dispatch({ changes: { from: 0, to: 'some text'.length, insert: '' } });

    expect(separatorCount(view)).toBe(before);
    view.destroy();
  });
});
