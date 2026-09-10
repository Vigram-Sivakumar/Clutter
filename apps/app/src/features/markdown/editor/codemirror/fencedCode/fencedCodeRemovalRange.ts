import type { EditorState } from '@codemirror/state';

/**
 * Computes the exact `[from, to)` range to delete for "Remove" on a fenced
 * code block, given its `FencedCode` node's own `from`/`to` — a real
 * document-text deletion (opening fence through closing fence, inclusive),
 * not a DOM/widget removal, so plain CM6 undo restores it like any other
 * edit.
 *
 * Directly adapted from `mediaPresentation/embedRemovalRange.ts`'s
 * `computeEmbedRemovalRange` — same three-case blank-line-collapse
 * reasoning (see that file's own doc comment for the full worked example
 * and rationale), generalized from a single-line node to a node spanning
 * `firstLine`..`lastLine` instead of one line, since a fenced code block
 * — unlike an embed — always spans at least two lines (opening fence,
 * closing fence) and often many more:
 *
 * 1. **The block is the entire document** — delete everything.
 * 2. **The block reaches the document's first or last line** — trim every
 *    consecutive blank line on the *interior* side down to nothing, plus
 *    the one separator newline joining that run to whatever real content
 *    precedes/follows it.
 * 3. **The block sits between two other lines** — consume the block's own
 *    lines plus **one** adjacent blank line (preferring the line before,
 *    falling back to the line after), collapsing a blank-line-delimited
 *    paragraph pair back down to a single gap.
 */
export function computeFencedCodeRemovalRange(
  state: EditorState,
  nodeFrom: number,
  nodeTo: number
): { from: number; to: number } {
  const firstLine = state.doc.lineAt(nodeFrom).number;
  const lastLine = state.doc.lineAt(nodeTo).number;
  const isFirst = firstLine === 1;
  const isLast = lastLine === state.doc.lines;

  if (isFirst && isLast) {
    return { from: 0, to: state.doc.length };
  }

  if (isLast) {
    let from = nodeFrom;
    for (let n = firstLine - 1; n >= 1; n--) {
      const line = state.doc.line(n);
      if (line.length !== 0) {
        break;
      }
      from = line.from;
    }
    if (from > 0) {
      from -= 1;
    }
    return { from, to: nodeTo };
  }

  if (isFirst) {
    let to = nodeTo;
    for (let n = lastLine + 1; n <= state.doc.lines; n++) {
      const line = state.doc.line(n);
      if (line.length !== 0) {
        break;
      }
      to = line.to;
    }
    if (to < state.doc.length) {
      to += 1;
    }
    return { from: 0, to };
  }

  const prevLine = state.doc.line(firstLine - 1);
  if (prevLine.length === 0) {
    return { from: prevLine.from, to: lineEndInclusive(state, lastLine) };
  }

  const nextLine = state.doc.line(lastLine + 1);
  if (nextLine.length === 0) {
    return { from: nodeFrom, to: lineEndInclusive(state, nextLine.number) };
  }

  return { from: nodeFrom, to: lineEndInclusive(state, lastLine) };
}

/** A line's own end position, extended by one to also consume its trailing `\n` when it isn't the document's last line. */
function lineEndInclusive(state: EditorState, lineNumber: number): number {
  const line = state.doc.line(lineNumber);
  return lineNumber < state.doc.lines ? line.to + 1 : line.to;
}
