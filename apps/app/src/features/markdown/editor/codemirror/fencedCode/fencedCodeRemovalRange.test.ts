import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';

import { computeFencedCodeRemovalRange } from './fencedCodeRemovalRange';

const FENCE = '```js\nconst a = 1;\n```';

function removalResult(doc: string) {
  const nodeFrom = doc.indexOf(FENCE);
  const nodeTo = nodeFrom + FENCE.length;
  const state = EditorState.create({ doc });
  const { from, to } = computeFencedCodeRemovalRange(state, nodeFrom, nodeTo);
  return state.doc.toString().slice(0, from) + state.doc.toString().slice(to);
}

describe('computeFencedCodeRemovalRange', () => {
  it('deletes the block plus one adjacent blank line, leaving a single blank line between the surrounding paragraphs', () => {
    const doc = `Some text\n\n${FENCE}\n\nMore text`;
    expect(removalResult(doc)).toBe('Some text\n\nMore text');
  });

  it('preserves surrounding content exactly (only the block is removed)', () => {
    const doc = `Line one\nLine two\n\n${FENCE}\n\nLine three\nLine four`;
    expect(removalResult(doc)).toBe('Line one\nLine two\n\nLine three\nLine four');
  });

  it('falls back to the following blank line when there is no preceding one', () => {
    const doc = `${FENCE}\n\nMore text`;
    expect(removalResult(doc)).toBe('More text');
  });

  it('deletes just its own lines (plus trailing newline) when adjacent to real content on both sides', () => {
    const doc = `Before\n${FENCE}\nAfter`;
    expect(removalResult(doc)).toBe('Before\nAfter');
  });

  it('deletes everything when the block is the only content in the document', () => {
    expect(removalResult(FENCE)).toBe('');
  });

  it('trims trailing blank lines when the block is the document\'s first line', () => {
    const doc = `${FENCE}\n\n\nAfter`;
    expect(removalResult(doc)).toBe('After');
  });

  it('trims leading blank lines when the block is the document\'s last line', () => {
    const doc = `Before\n\n\n${FENCE}`;
    expect(removalResult(doc)).toBe('Before');
  });

  it('works correctly for a multi-line code body, not just a single-line one', () => {
    const multiLineFence = '```js\nconst a = 1;\nconst b = 2;\nconsole.log(a + b);\n```';
    const doc = `Before\n\n${multiLineFence}\n\nAfter`;
    const nodeFrom = doc.indexOf(multiLineFence);
    const nodeTo = nodeFrom + multiLineFence.length;
    const state = EditorState.create({ doc });
    const { from, to } = computeFencedCodeRemovalRange(state, nodeFrom, nodeTo);
    const result = state.doc.toString().slice(0, from) + state.doc.toString().slice(to);
    expect(result).toBe('Before\n\nAfter');
  });
});
