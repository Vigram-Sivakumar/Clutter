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

function separatorHeights(view: EditorView): number[] {
  return Array.from(view.dom.querySelectorAll('.cm-block-separator')).map((el) =>
    parseInt((el as HTMLElement).style.height, 10)
  );
}

describe('blockSeparatorDecoration — physical-line boundaries', () => {
  it('gives every physical line of one Paragraph a 12px leading separator (line 1 excepted)', () => {
    const view = mountView('Line one\nLine two\nLine three');
    expect(separatorHeights(view)).toEqual([12, 12]);
    view.destroy();
  });

  it('gives 12px between two separate paragraphs (through their blank line)', () => {
    const view = mountView('Paragraph A\n\nParagraph B');
    expect(separatorHeights(view)).toEqual([12, 12]);
    view.destroy();
  });

  it('gives no leading separator before the very first line of the document', () => {
    const view = mountView('First line\nSecond line');
    expect(separatorHeights(view)).toEqual([12]);
    view.destroy();
  });
});

describe('blockSeparatorDecoration — empty lines stay stable under typing', () => {
  it('typing into an existing blank line never changes the separator count or heights', () => {
    const view = mountView('Line A\n\nLine B');
    expect(separatorHeights(view)).toEqual([12, 12]);

    const from = view.state.doc.toString().indexOf('\n\n') + 1;
    view.dispatch({ changes: { from, insert: 'Something' } });

    expect(view.state.doc.toString()).toBe('Line A\nSomething\nLine B');
    expect(separatorHeights(view)).toEqual([12, 12]);
    view.destroy();
  });

  it('deleting the typed text back down to empty restores the same separators', () => {
    const view = mountView('Line A\nSomething\nLine B');
    expect(separatorHeights(view)).toEqual([12, 12]);

    const from = view.state.doc.toString().indexOf('Something');
    view.dispatch({ changes: { from, to: from + 'Something'.length, insert: '' } });

    expect(view.state.doc.toString()).toBe('Line A\n\nLine B');
    expect(separatorHeights(view)).toEqual([12, 12]);
    view.destroy();
  });

  it('multiple consecutive empty lines each contribute their own 12px, accumulating', () => {
    const view = mountView('Line A\n\n\nLine B');
    expect(separatorHeights(view)).toEqual([12, 12, 12]);
    view.destroy();
  });
});

describe('blockSeparatorDecoration — lists', () => {
  it('gives 6px between tight list items, and 12px before/after the whole list', () => {
    // A blank line is needed before "Below" to actually exit the list —
    // unindented text immediately after the last item, with no blank
    // line, lazily continues that item's own paragraph per CommonMark
    // (confirmed against the real parser), not a list-exit.
    const view = mountView('Above\n- Item 1\n- Item 2\n- Item 3\n\nBelow');
    expect(separatorHeights(view)).toEqual([12, 6, 6, 12, 12]);
    view.destroy();
  });

  it('gives the identical internal gaps for a loose list — the blank lines inside it still resolve as inside, so they stay 6px, not 12px', () => {
    const view = mountView('Above\n- Item 1\n\n- Item 2\n\n- Item 3\n\nBelow');
    expect(separatorHeights(view)).toEqual([12, 6, 6, 6, 6, 12, 12]);
    view.destroy();
  });

  it('keeps a nested list at 6px throughout — parent/nested boundaries never jump to 12px', () => {
    const view = mountView('- Parent item\n  - Nested item 1\n  - Nested item 2\n- Parent item 2');
    expect(separatorHeights(view)).toEqual([6, 6, 6]);
    view.destroy();
  });
});

describe('blockSeparatorDecoration — blockquotes', () => {
  it('gives 6px between blockquote continuation lines, 12px before/after the whole quote', () => {
    const view = mountView('Above\n> Quote line 1\n> Quote line 2\n> Quote line 3\n\nBelow');
    expect(separatorHeights(view)).toEqual([12, 6, 6, 12, 12]);
    view.destroy();
  });

  it('keeps a nested blockquote at 6px throughout', () => {
    const view = mountView('> Quote\n>\n> > Nested quote\n> >\n> > More nested\n>\n> Back to outer');
    expect(separatorHeights(view)).toEqual([6, 6, 6, 6, 6, 6]);
    view.destroy();
  });

  it('a list inside a blockquote stays 6px throughout', () => {
    const view = mountView('> Quote\n> - Item 1\n> - Item 2\n> Back to quote text');
    expect(separatorHeights(view)).toEqual([6, 6, 6]);
    view.destroy();
  });
});

describe('blockSeparatorDecoration — tables', () => {
  it('gives 0px between every table row/line (no widget at all), and normal 12px before/after the whole table', () => {
    // GFM table rows lazily continue too (confirmed against the real
    // parser) — a blank line is needed before "Below" to actually exit.
    const view = mountView('Above\n| a | b |\n| - | - |\n| 1 | 2 |\n\nBelow');
    expect(separatorHeights(view)).toEqual([12, 12, 12]);
    view.destroy();
  });
});

describe('blockSeparatorDecoration — fenced code', () => {
  it('never emits a separator inside a fenced code block, but the exit transition still gets its normal 12px', () => {
    const view = mountView('Above\n```\nline one\nline two\n```\nBelow');
    expect(separatorHeights(view)).toEqual([12, 12]);
    view.destroy();
  });
});

describe('blockSeparatorDecoration — Image/Embed', () => {
  it('an image alone on its own line gets normal 12px from its neighbors, no separate intra-line handling', () => {
    const view = mountView('Above\n![img](https://example.com/a.png)\nBelow');
    expect(separatorHeights(view)).toEqual([12, 12]);
    view.destroy();
  });

  it('inserts separators on both sides of an inline image sitting mid-paragraph', () => {
    const view = mountView('before ![alt](https://example.com/a.png) after');
    expect(separatorHeights(view)).toEqual([12, 12]);
    view.destroy();
  });

  it('does not double up between the physical-line boundary and the intra-line boundary for an inline image', () => {
    const view = mountView('Above\nbefore ![img](https://example.com/a.png) after\nBelow');
    // Above->line2 and line2->Below are the two physical-line boundaries
    // (12 each); before/after the image are two more, same-line ones (12
    // each) — four total, none doubled.
    expect(separatorHeights(view)).toEqual([12, 12, 12, 12]);
    view.destroy();
  });

  it('inserts exactly one separator between two images sharing one physical line with no gap', () => {
    const view = mountView('![a](https://example.com/a.png)![b](https://example.com/b.png)');
    expect(separatorHeights(view)).toEqual([12]);
    view.destroy();
  });

  it('inserts only a leading separator when text precedes the image but nothing follows on that line', () => {
    const view = mountView('before ![alt](https://example.com/a.png)');
    expect(separatorHeights(view)).toEqual([12]);
    view.destroy();
  });

  it('inserts only a trailing separator when text follows the image but nothing precedes it on that line', () => {
    const view = mountView('![alt](https://example.com/a.png) after');
    expect(separatorHeights(view)).toEqual([12]);
    view.destroy();
  });
});

describe('blockSeparatorDecoration — general', () => {
  it('does not affect the stored document text', () => {
    const text = 'before ![alt](https://example.com/a.png) after\n\n```\ncode\n```\n\n- Item 1\n- Item 2';
    const view = mountView(text);
    expect(view.state.doc.toString()).toBe(text);
    view.destroy();
  });
});
