import { Prec, type Extension } from '@codemirror/state';
import { EditorView, keymap, type Command, type KeyBinding } from '@codemirror/view';

import { computeConcealedFolderPrefixRange } from './wikiLinkLivePreview';
import { findWikiLinkAt } from './wikiLinkEngagement';

/**
 * Narrowly-scoped ArrowLeft/ArrowRight navigation across a WikiLink's
 * concealed folder-prefix (e.g. the `Projects/Design/` in
 * `[[Projects/Design/My Note]]`) — reopens
 * docs/editor-architecture-decisions.md's "CodeMirror owns cursor and
 * selection behavior; Clutter does not intercept Arrow keys or reposition
 * the cursor" entry (2026-08-23), per that entry's own reservation clause:
 * "If/when Live Preview decorations for these constructs are re-enabled,
 * whether an equivalent mechanism is genuinely needed again is an open
 * question to re-decide then... not reinstated by default." WikiLink's
 * folder-prefix concealment is exactly that re-enabling, and the plain
 * default-CM6 behavior it produces (arrow-key-stuck-at-`[[` investigation)
 * is exactly the confusing symptom the retired mechanism used to prevent.
 *
 * Deliberately narrow, unlike the retired `semanticToken/tokenKeymap.ts`
 * this supersedes-the-supersession of:
 *
 * - Only `ArrowLeft`/`ArrowRight`. No other key, no drag-selection
 *   snapping (`wikiLinkSelectionSnap.ts` stays dormant/unwired, per the
 *   existing convention for modules like it), no keyboard-activation
 *   handling (unrelated to this file's job).
 * - Only fires when the caret sits exactly on one edge of the concealed
 *   folder-prefix range and is about to step *into* it in the direction
 *   of travel. Any other caret position (inside the visible `[[`/
 *   filename/`|alias`/`]]` text, inside a *different* WikiLink with no
 *   folder component, anywhere the caret didn't arrive via this exact
 *   adjacency) falls through to CM6's ordinary default handling
 *   untouched.
 * - The hop is a pure `selection` dispatch — no `changes`. The
 *   folder-prefix text is never touched, deleted, or altered; the
 *   underlying Markdown is byte-for-byte identical before and after.
 * - Backspace, Delete, typing, mouse click, and drag selection are not
 *   read, matched, or referenced anywhere in this file — this keymap
 *   contributes exactly two `KeyBinding` entries and nothing else, so
 *   there is no code path here that could affect them. The concealed
 *   range itself stays deliberately non-atomic (no `EditorView.atomicRanges`
 *   entry, unchanged from `wikiLinkLivePreview.ts`): `deleteByChar` (the
 *   command backing both Backspace and Delete, `@codemirror/commands`)
 *   reads the exact same `atomicRanges` facet cursor motion does, so
 *   marking the range atomic would silently break "Backspace deletes one
 *   real character at a time inside the concealed run" as a side effect —
 *   confirmed against `@codemirror/commands`' own source before ruling
 *   that mechanism out entirely in favor of this one.
 * - Reuses `computeConcealedFolderPrefixRange` (from `wikiLinkLivePreview.ts`,
 *   exported for exactly this) and `findWikiLinkAt` (from
 *   `wikiLinkEngagement.ts`, already shared with mouse-handling and
 *   at-rest/engaged queries) unchanged — this file computes no parsing or
 *   engagement logic of its own; the hop target is always identical to
 *   what `wikiLinkLivePreview.ts` is already rendering as concealed, by
 *   construction, not by keeping two definitions in sync by hand.
 *
 * A caret can only ever reach either edge of the concealed range via a
 * genuinely engaged WikiLink (at rest, that whole span is a single atomic
 * replace widget the caret cannot land inside), so no separate
 * "is this WikiLink currently engaged" check is needed here — finding the
 * node via `findWikiLinkAt` and having the caret sit exactly on the
 * concealed range's own boundary already implies it.
 */
function jumpConcealedFolderPrefix(direction: 1 | -1): Command {
  return (view: EditorView): boolean => {
    const { state } = view;
    const selection = state.selection.main;
    if (!selection.empty) {
      return false;
    }

    const pos = selection.head;
    const node = findWikiLinkAt(state, pos);
    if (!node) {
      return false;
    }

    const concealed = computeConcealedFolderPrefixRange(node, state);
    if (!concealed) {
      return false;
    }

    if (direction === 1 && pos === concealed.from) {
      view.dispatch({ selection: { anchor: concealed.to }, scrollIntoView: true });
      return true;
    }
    if (direction === -1 && pos === concealed.to) {
      view.dispatch({ selection: { anchor: concealed.from }, scrollIntoView: true });
      return true;
    }
    return false;
  };
}

const wikiLinkConcealedPrefixKeymap: readonly KeyBinding[] = [
  { key: 'ArrowRight', run: jumpConcealedFolderPrefix(1) },
  { key: 'ArrowLeft', run: jumpConcealedFolderPrefix(-1) },
];

/**
 * `Prec.highest`: must win over `@codemirror/commands`' `defaultKeymap`
 * (which binds plain `ArrowLeft`/`ArrowRight` to `cursorCharLeft`/
 * `cursorCharRight`) so this hop is tried first at exactly the concealed
 * range's boundary; every other caret position returns `false` and CM6's
 * own default keymap handles it exactly as before, unaffected.
 */
export function wikiLinkConcealedPrefixNavigation(): Extension {
  return Prec.highest(keymap.of([...wikiLinkConcealedPrefixKeymap]));
}
