import { syntaxTree } from '@codemirror/language';
import { StateField, type EditorState, type Extension, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

import { BLOCK_SPACING_PARTICIPANTS } from './blockSpacingParticipants';

/**
 * The one source of truth for the separator's height. Read directly by
 * `BlockSeparatorWidget.toDOM`/`estimatedHeight` below — never a CSS
 * value, so there is exactly one place to change it.
 */
export const BLOCK_SEPARATOR_HEIGHT_PX = 12;

/**
 * An empty, fixed-height block widget — genuinely CM6-measured geometry
 * (per `@codemirror/view`'s own `WidgetDecorationSpec.block` doc comment:
 * block-level decorations participate in the editor's own height/position
 * model), unlike `margin` or CSS-only spacing, which CM6 does not
 * measure. Confirmed safe for rendering/navigation/click/selection by
 * direct interactive testing in the running app before this was built
 * (see the architecture investigation this implements).
 */
class BlockSeparatorWidget extends WidgetType {
  override eq(): boolean {
    // Every instance is identical (fixed height, no state) — always equal,
    // so CM6 reuses the existing DOM node across rebuilds instead of
    // recreating it.
    return true;
  }

  override toDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'cm-block-separator';
    dom.style.height = `${BLOCK_SEPARATOR_HEIGHT_PX}px`;
    return dom;
  }

  override get estimatedHeight(): number {
    return BLOCK_SEPARATOR_HEIGHT_PX;
  }
}

function firstNonWhitespaceOffset(text: string): number {
  return text.length - text.trimStart().length;
}

function nearestParticipant(state: EditorState, probePos: number): SyntaxNode | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(probePos, 1);
  for (; node; node = node.parent) {
    if (BLOCK_SPACING_PARTICIPANTS.has(node.name)) {
      return node;
    }
  }
  return null;
}

/**
 * Whether *any* document extent exists before `pos` at all — deliberately
 * a pure position check, not a content check. Earlier iterations of this
 * algorithm asked "is the neighboring line blank or not," which meant a
 * separator could appear or disappear the instant a user typed the first
 * character into an already-existing empty line, visibly shifting the
 * block below/above it. Whether that neighboring line is blank or full of
 * text never changes whether it *exists* as a document position, so a
 * check built only on position is stable under ordinary typing — it only
 * changes on a genuinely structural edit (inserting/removing a line).
 */
function hasDocumentExtentBefore(pos: number): boolean {
  return pos > 0;
}

/**
 * Symmetric to {@link hasDocumentExtentBefore}. Deliberately *not*
 * adjusted for a document's conventional trailing `\n` — CM6 treats the
 * line after that newline as a real, clickable, typeable line (its own
 * "trailing editable line"), and adjusting for it would reintroduce the
 * exact instability this algorithm exists to avoid: appending text to
 * that trailing line would change whether the adjustment applies,
 * flipping the separator right as the user types into an already-
 * existing line. The raw position check never flips there either way, so
 * it's kept simple. The one visible consequence: a participant that is
 * the last real content in a file saved with a trailing newline (the
 * common convention) still gets a small trailing separator, because that
 * newline's own empty line genuinely exists as a document position.
 */
function hasDocumentExtentAfter(state: EditorState, pos: number): boolean {
  return pos < state.doc.length;
}

/**
 * The physical line to evaluate for a node's *trailing* edge. `node.to`
 * is exclusive and, for a multi-line block node, can itself already
 * equal the very next line's own `.from` (a line-based block parser's
 * span conventionally includes its own trailing newline) — most visibly
 * for a block ending at the document's trailing newline, where `node.to`
 * lands on the synthetic empty final line (the same phantom-line
 * boundary `fencedCodeBlockLineDecoration.ts`'s own `--last` computation
 * already had to account for). Probing `node.to`'s own last real
 * character instead always resolves to the node's own true last line,
 * regardless of which convention applies.
 */
function trailingLine(state: EditorState, node: { from: number; to: number }) {
  const lastRealPos = node.to > node.from ? node.to - 1 : node.to;
  return state.doc.lineAt(lastRealPos);
}

/**
 * Whether the content immediately following `node`'s own end (same-line
 * first, else the next line, skipping forward past any run of blank
 * lines) is itself the *start* of another participant node — i.e.
 * whether the boundary right after `node` will already get a separator
 * from that node's own leading check. Deferring to it here is what keeps
 * two adjacent participants (same line, consecutive lines, or separated
 * by one or more blank lines) at exactly one separator instead of two;
 * only called when {@link hasDocumentExtentAfter} is already true.
 */
function followingContentStartsParticipant(state: EditorState, node: { from: number; to: number }): boolean {
  const line = trailingLine(state, node);
  const sameLineAfter = node.to <= line.to ? state.sliceDoc(node.to, line.to) : '';
  if (sameLineAfter.trim().length > 0) {
    const probePos = node.to + firstNonWhitespaceOffset(sameLineAfter);
    const found = nearestParticipant(state, probePos);
    return found !== null && found.from === probePos;
  }
  for (let lineNumber = line.number + 1; lineNumber <= state.doc.lines; lineNumber++) {
    const candidate = state.doc.line(lineNumber);
    if (candidate.text.trim().length === 0) {
      continue;
    }
    const probePos = candidate.from + firstNonWhitespaceOffset(candidate.text);
    const found = nearestParticipant(state, probePos);
    return found !== null && found.from === probePos;
  }
  return false;
}

/**
 * Boundary-ownership algorithm (see the architecture investigation this
 * implements for the full case table, and its follow-up correction for
 * this position-based, content-independent version). For every
 * participant node:
 *
 * - **Leading** edge: a separator is needed whenever any document extent
 *   exists before it at all — emitted here, at this node's own `.from`.
 *   Deliberately *not* conditioned on whether that preceding extent is a
 *   blank line or has real text: see {@link hasDocumentExtentBefore}'s own
 *   doc comment for why content-sensitivity was removed. Document start
 *   needs nothing (no artificial spacing before the very first block).
 *   The leading check never defers — it always owns its boundary.
 * - **Trailing** edge: symmetric, at this node's own `.to`, *except*
 *   skipped whenever the next real content (skipping blank lines) is
 *   itself the start of another participant — that boundary is instead
 *   the *next* node's own leading check, so it is never computed twice.
 *
 * Each boundary is therefore decided by exactly one of the two checks
 * above, never both — there is no code path that can emit two widgets for
 * the same boundary. And because neither check inspects the content of
 * any line, no separator can appear, disappear, or move purely because
 * the user typed into (or deleted from) an existing line — only inserting
 * or removing a line changes anything.
 */
function buildSeparators(state: EditorState): Range<Decoration>[] {
  const ranges: Range<Decoration>[] = [];

  syntaxTree(state).iterate({
    enter: (node) => {
      if (!BLOCK_SPACING_PARTICIPANTS.has(node.name)) {
        return;
      }

      if (hasDocumentExtentBefore(node.from)) {
        ranges.push(
          Decoration.widget({ widget: new BlockSeparatorWidget(), block: true, side: -1 }).range(node.from)
        );
      }

      if (hasDocumentExtentAfter(state, node.to) && !followingContentStartsParticipant(state, node)) {
        ranges.push(Decoration.widget({ widget: new BlockSeparatorWidget(), block: true, side: 1 }).range(node.to));
      }
    },
  });

  return ranges;
}

/**
 * A `StateField`, not a `ViewPlugin` and not a view-dependent decorations
 * function — CM6 throws `RangeError: Block decorations may not be
 * specified via plugins` for either of those (confirmed directly against
 * the installed `@codemirror/view` in this session's architecture
 * investigation). Block-level decorations must be transaction-
 * synchronized, unlike `EditorView.blockWrappers` (which does accept a
 * view function, per `fencedCodeBlockWrapper.ts`'s own doc comment) — the
 * two mechanisms are not interchangeable in what's allowed to produce
 * them.
 */
const blockSeparatorField = StateField.define<DecorationSet>({
  create(state) {
    return Decoration.set(buildSeparators(state), true);
  },
  update(value, tr) {
    if (tr.docChanged) {
      return Decoration.set(buildSeparators(tr.state), true);
    }
    return value;
  },
  provide: (field) => EditorView.decorations.from(field),
});

/**
 * Shared block-boundary separator — empty visual spacing above/below any
 * `BLOCK_SPACING_PARTICIPANTS` node, exactly one per boundary, never
 * doubled with an adjacent participant or with a real blank line. See
 * this file's own doc comments and `blockSpacingParticipants.ts` for the
 * opt-in mechanism a future block type (e.g. a URL embed) uses to join.
 */
export function blockSeparatorDecoration(): Extension {
  return blockSeparatorField;
}
