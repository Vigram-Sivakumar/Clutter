import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

export interface FencedCodeInfoRange {
  /** The `CodeInfo` node's own range, or — when there's no info string at all — the zero-width insertion point right after the opening fence marker. */
  readonly from: number;
  readonly to: number;
  /** The raw, as-typed info text (`''` when there's no `CodeInfo` node). */
  readonly rawInfo: string;
}

/**
 * Re-resolves a fenced code block's `CodeInfo` (language identifier) range
 * fresh from the live syntax tree, given only the block's own stable
 * `FencedCode.from` — the same "never trust a captured range, re-resolve
 * at click/select time" contract `fencedCodeCopyButtonDecoration.ts`'s own
 * `nearestFencedCodeFrom` already establishes, reused here via the
 * identical resolve-then-walk-up shape.
 *
 * Used by `FencedCodeActionsMenu.tsx`'s "Change Language" submenu, both to
 * read the block's *current* language (for the submenu's checkmark) and,
 * on selection, to compute the exact `[from, to)` to replace — never the
 * code content itself, only the info string, whether or not one already
 * exists (`from === to` when absent, so a plain insert at that position
 * adds one rather than needing a separate no-info-string code path).
 */
export function resolveFencedCodeInfoRange(
  state: EditorState,
  fencedCodeFrom: number
): FencedCodeInfoRange | null {
  let node = syntaxTree(state).resolveInner(fencedCodeFrom + 1, 1);
  for (; node; node = node.parent!) {
    if (node.name === 'FencedCode' && node.from === fencedCodeFrom) {
      break;
    }
  }
  if (!node) {
    return null;
  }

  const openMark = node.firstChild;
  if (!openMark || openMark.name !== 'CodeMark') {
    return null;
  }

  const codeInfo = node.getChild('CodeInfo');
  if (codeInfo) {
    return { from: codeInfo.from, to: codeInfo.to, rawInfo: state.sliceDoc(codeInfo.from, codeInfo.to) };
  }
  return { from: openMark.to, to: openMark.to, rawInfo: '' };
}

/**
 * Re-resolves a fenced code block's live `.cm-code-block` wrapper element
 * fresh from the DOM, given only its stable `FencedCode.from` — never a
 * captured DOM node.
 *
 * **Why this exists — a real bug, not speculative hardening.** The
 * Actions/Copy/Format button widgets all render at the same computed
 * position (`CodeInfo.to`/the opening `CodeMark`'s own end). Any edit to
 * the info string itself — exactly what "Change Language" does — moves
 * that position, and CM6 does not migrate the existing widget DOM nodes
 * to the new position; it tears down and rebuilds them, even when
 * `WidgetType.eq()` says the widget is unchanged. Confirmed live via a
 * temporary trace: `MarkdownEditor.tsx`'s `fencedCodeMenu.anchor.current`
 * (the Actions button captured in React state when its menu opened)
 * measured `isConnected: false` immediately after a language change —
 * the button the menu was anchored to had already been replaced. Cleanup
 * code that then called `.closest('.cm-code-block')` on that stale node
 * silently found nothing (or the wrong, detached subtree) and skipped
 * clearing `--menu-open`/`--active` on the real, live buttons, leaving
 * Copy permanently visible.
 *
 * `view.domAtPos(pos)` — CM6's own position→live-DOM-node lookup — is
 * what makes this reliable across that rebuild: it's resolved fresh, at
 * call time, against whatever the view's *current* DOM actually is, not
 * against anything captured earlier.
 */
export function resolveFencedCodeBlockWrapper(
  view: EditorView,
  fencedCodeFrom: number
): HTMLElement | null {
  const info = resolveFencedCodeInfoRange(view.state, fencedCodeFrom);
  if (!info) {
    return null;
  }
  const { node } = view.domAtPos(info.to);
  const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return el?.closest<HTMLElement>('.cm-code-block') ?? null;
}
