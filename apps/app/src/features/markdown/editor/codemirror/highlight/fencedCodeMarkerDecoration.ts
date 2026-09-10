import type { Extension } from '@codemirror/state';

import { liveMarkDecoration, type MarkRangeSelector } from './liveMarkDecoration';

/**
 * Live Preview marker hiding for fenced code blocks (` ``` `/`~~~`),
 * built on the same shared `liveMarkDecoration` mechanism as
 * `headingMarkerDecoration.ts` — the closest existing analog. A `FencedCode`
 * node's opening line is *entirely* marker (its `CodeMark` plus an optional
 * `CodeInfo` language string, nothing else on that line) with no separate
 * "title text" the way an ATX heading has — same shape as heading's own
 * `HeaderMark` + separator, hidden the same way, once per fence: only the
 * `CodeMark` ranges are concealed here, exactly mirroring heading's own
 * "hide only `HeaderMark`, leave the inline title content alone" split.
 * `CodeInfo` (the language string) and `CodeText` (the code body, already
 * getting nested-language syntax highlighting per `fencedCode/`) are never
 * touched by this decoration — presentation for those (a language label,
 * container styling) is explicitly a later, separate phase.
 *
 * `'node-range'` engagement (the default `liveMarkDecoration` mode, same
 * as heading/emphasis/strikethrough/inline-code): the selection must be
 * contained within the *entire* `FencedCode` node's span, not merely on
 * the same physical line as a `CodeMark`. This is the one place fenced
 * code's engagement genuinely differs from heading/blockquote's own
 * `'physical-line'` mode — a fence's own marker line can be many lines
 * away from where the caret actually sits (inside the code body), and
 * per the product requirement both the opening and closing fence must
 * reveal together as soon as the caret is anywhere inside the block, not
 * only when it happens to land on one fence's own line.
 *
 * Concealment itself reuses `liveMarkDecoration`'s existing
 * `Decoration.replace({})` mechanism — not CSS `opacity`/`color:
 * transparent` — for the same reason every other construct routed
 * through this file already avoids CSS-only hiding: a CSS-hidden-but-real
 * text node still participates in native click hit-testing and
 * double-click word-selection at the hidden/visible boundary (see this
 * module's own doc comment). Blockquote's `QuoteMark` is the one
 * documented exception, kept as real CSS-concealed text specifically
 * because it needs a reserved-width gutter column — fenced code has no
 * equivalent need, so there is no reason to repeat that tradeoff here.
 */
const isFencedCodeNode = (nodeName: string): boolean => nodeName === 'FencedCode';

const getFencedCodeMarkRanges: MarkRangeSelector = (node, state) => {
  const openMark = node.node.firstChild;
  if (!openMark || openMark.name !== 'CodeMark') {
    return [];
  }

  const ranges = [{ from: openMark.from, to: openMark.to }];

  // The one separator character CommonMark allows between the opening
  // fence and its info string (` ```js` has none; ` ``` js` does) belongs
  // to neither `CodeMark` nor `CodeInfo` — same gap `headingMarkerDecoration`
  // already has to account for between `HeaderMark` and the title text.
  const separatorFrom = openMark.to;
  const separatorTo = separatorFrom + 1;
  if (separatorTo <= state.doc.length && state.sliceDoc(separatorFrom, separatorTo) === ' ') {
    ranges.push({ from: separatorFrom, to: separatorTo });
  }

  // The closing fence is a second, distinct `CodeMark` child — absent
  // entirely for a fence left open at document/container end (no matching
  // close line was ever found; `@lezer/markdown`'s `FencedCode` parser
  // only emits a closing `CodeMark` when a real closing line was matched).
  // Guarding `lastChild !== openMark` (rather than just checking its name)
  // is what keeps a single-`CodeMark`, never-closed fence from having its
  // one real marker concealed twice as both "open" and "close".
  const closeMark = node.node.lastChild;
  if (closeMark && closeMark !== openMark && closeMark.name === 'CodeMark') {
    ranges.push({ from: closeMark.from, to: closeMark.to });
  }

  return ranges;
};

export function fencedCodeMarkerDecoration(): Extension {
  return liveMarkDecoration(isFencedCodeNode, getFencedCodeMarkRanges, 'node-range', 'cm-fenced-code-marker');
}
