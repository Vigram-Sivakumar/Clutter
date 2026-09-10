// @vitest-environment jsdom
import { ensureSyntaxTree, syntaxTree } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { markdownLanguageExtension } from '../markdownLanguage';
import { collectActiveInlineClasses, isDelimitedMarkConstruct } from './inlineLivePreviewParticipants';

/**
 * Direct unit coverage for `collectActiveInlineClasses` — the pure,
 * tree-only mechanism docs/editor-architecture-decisions.md's "Inline
 * formatting composition at the token level" entry describes. Exercised
 * here against the syntax tree alone (no decorations, no widgets, no
 * `EditorView`), since the function itself takes only a `SyntaxNodeRef`
 * and has no other dependency — the property this test suite exists to
 * pin down. Integration-level proof that a real widget's `classList`
 * ends up composed correctly lives in `inlineLivePreviewRegion.test.ts`
 * (Tag/Date) and `wikilink/wikiLinkLivePreview.test.ts` (WikiLink); this
 * file is about the shared function in isolation.
 */
function nodeAt(doc: string, nodeName: string) {
  const state = EditorState.create({ doc, extensions: [markdownLanguageExtension()] });
  const tree = ensureSyntaxTree(state, doc.length) ?? syntaxTree(state);
  let found: ReturnType<typeof tree.resolve> | null = null;
  tree.iterate({
    enter: (node) => {
      if (!found && node.name === nodeName) {
        found = node.node;
      }
    },
  });
  if (!found) {
    throw new Error(`no ${nodeName} node found in ${JSON.stringify(doc)}`);
  }
  return found as NonNullable<typeof found>;
}

describe('collectActiveInlineClasses', () => {
  it('no enclosing delimited-mark construct: empty', () => {
    const node = nodeAt('plain text', 'Paragraph');
    expect(collectActiveInlineClasses(node)).toEqual([]);
  });

  it('one enclosing construct: its content class alone', () => {
    // The Tag-like leaf here is irrelevant to this function — it walks
    // ancestors of *any* node, so an ordinary Emphasis child stands in.
    const node = nodeAt('~~struck~~', 'StrikethroughMark');
    expect(collectActiveInlineClasses(node)).toEqual(['tok-strike']);
  });

  it('two levels deep, innermost first: **~~x~~** and ~~**x**~~ both compose the same two classes regardless of order', () => {
    const innerFirst = nodeAt('~~**x**~~', 'EmphasisMark');
    expect(collectActiveInlineClasses(innerFirst)).toEqual(['tok-strong', 'tok-strike']);

    const outerFirst = nodeAt('**~~x~~**', 'StrikethroughMark');
    expect(collectActiveInlineClasses(outerFirst)).toEqual(['tok-strike', 'tok-strong']);
  });

  it('three levels deep: ~~==**x**==~~ composes all three, innermost first', () => {
    const node = nodeAt('~~==**x**==~~', 'EmphasisMark');
    expect(collectActiveInlineClasses(node)).toEqual(['tok-strong', 'tok-highlight', 'tok-strike']);
  });

  it('stops at a non-qualifying ancestor (Paragraph) rather than walking to the document root', () => {
    const node = nodeAt('before ~~struck~~ after', 'StrikethroughMark');
    // Only Strikethrough itself qualifies; Paragraph/Document above it do not.
    expect(collectActiveInlineClasses(node)).toEqual(['tok-strike']);
  });

  it('a sibling formatted region does not leak into an unrelated node\'s ancestry', () => {
    const node = nodeAt('**bold** plain #tag', 'StrongEmphasis');
    // StrongEmphasis's own parent is Paragraph, not itself a delimited-mark
    // construct — nothing should be collected for the StrongEmphasis node
    // itself (its own ancestors, not its own class).
    expect(collectActiveInlineClasses(node)).toEqual([]);
  });
});

describe('isDelimitedMarkConstruct', () => {
  it('true for a construct with two identically-named *Mark-suffixed children', () => {
    const node = nodeAt('~~struck~~', 'Strikethrough');
    expect(isDelimitedMarkConstruct(node)).toBe(true);
  });

  it('false for an ordinary block container', () => {
    const node = nodeAt('plain text', 'Paragraph');
    expect(isDelimitedMarkConstruct(node)).toBe(false);
  });

  it('false for a leaf node with no children at all', () => {
    const node = nodeAt('~~struck~~', 'StrikethroughMark');
    expect(isDelimitedMarkConstruct(node)).toBe(false);
  });
});
