import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/**
 * Generic reveal-on-engagement query mechanism, extracted from the
 * WikiLink vertical slice once it proved this part is genuinely
 * kind-agnostic (docs/editor-architecture-decisions.md §11). Every
 * semantic inline construct kind shares this: engagement is derived
 * purely from selection containment against a Lezer node range, never
 * stored state. Which node names count as "a semantic inline token" is
 * supplied per call site via `TokenNodePredicate` — this module has no
 * knowledge of `WikiLink` or any other concrete kind.
 */
export interface TokenNodeRange {
  readonly from: number;
  readonly to: number;
}

export type TokenNodePredicate = (nodeName: string) => boolean;

/**
 * A selection strictly within the node's range — including a zero-width
 * caret at either boundary — means engaged.
 *
 * Never engaged when `state.readOnly` — a permanently read-only view
 * (a note embed's nested `EditorView`, `createEditorView.ts`'s `readOnly`
 * option) can never actually be edited, so a click/selection landing
 * inside a construct must never flip it into its raw-source form; the
 * whole point of a note embed is that its content stays permanently
 * rendered, exactly like every other visual behavior it reuses from the
 * normal editor. This is the one shared choke point every reveal-on-
 * engage construct (heading, emphasis/strong/strikethrough/highlight/
 * inline-code, blockquote, WikiLink, Tag, Date) already funnels through,
 * so guarding it here — rather than in each construct — is what keeps
 * this a one-line fix instead of N. `state.selection` itself is
 * untouched: text selection and copy inside a read-only view are
 * unaffected, only this decoration-facing query is short-circuited.
 * A side effect, not a regression: `findAtRestTokenAt` (used by every
 * click-to-navigate handler) also calls this — forcing "never engaged"
 * means a click on a WikiLink/Tag/Date inside a read-only view always
 * resolves to "at rest" and therefore always activates navigation,
 * never a half-revealed state that could never be edited anyway.
 */
export function isTokenEngaged(state: EditorState, node: TokenNodeRange): boolean {
  if (state.readOnly) {
    return false;
  }
  const selection = state.selection.main;
  return selection.from >= node.from && selection.to <= node.to;
}

/**
 * Finds the token node (if any, per `isTokenNode`) whose range contains
 * `pos`, scoped to a narrow window around `pos` rather than the whole
 * document — this is called from hot paths (mouse handlers, arrow-key
 * commands), not a viewport-wide decoration pass.
 */
export function findTokenAt(
  state: EditorState,
  pos: number,
  isTokenNode: TokenNodePredicate
): TokenNodeRange | null {
  let found: TokenNodeRange | null = null;
  syntaxTree(state).iterate({
    from: Math.max(0, pos - 1),
    to: Math.min(state.doc.length, pos + 1),
    enter: (node) => {
      if (isTokenNode(node.name) && node.from <= pos && pos <= node.to) {
        found = { from: node.from, to: node.to };
      }
    },
  });
  return found;
}

/** Same as {@link findTokenAt}, but only returns a node that is currently at rest (not engaged). */
export function findAtRestTokenAt(
  state: EditorState,
  pos: number,
  isTokenNode: TokenNodePredicate
): TokenNodeRange | null {
  const node = findTokenAt(state, pos, isTokenNode);
  if (!node || isTokenEngaged(state, node)) {
    return null;
  }
  return node;
}
