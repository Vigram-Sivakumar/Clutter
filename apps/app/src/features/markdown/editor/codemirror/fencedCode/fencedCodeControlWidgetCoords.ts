import type { Rect } from '@codemirror/view';

/**
 * Shared `WidgetType.coordsAt` implementation for every fenced-code
 * control button (Copy/Format/Actions — `FencedCodeCopyButtonWidget`,
 * `FencedCodeFormatButtonWidget`, `FencedCodeActionsButtonWidget`).
 *
 * **Why this exists at all.** All three widgets are inserted via
 * `Decoration.widget({ side: 1 })` at the exact same document position —
 * `codeInfo.to` (right after a fenced block's language info, e.g. `js` in
 * ` ```js`) or `openMark.to` when there's no language yet (right after the
 * opening ` ``` ` itself). Left un-overridden, CM6's own default `coordsAt`
 * behavior (`WidgetTile.coordsInWidget`, `@codemirror/view`) measures
 * wherever the widget's own DOM node actually renders
 * (`dom.getClientRects()`) — which is normally fine, since a widget
 * usually renders right where it's anchored. These three don't:
 * `MarkdownEditor.css` gives Copy/Format/Actions `position: absolute`,
 * pulling them out of normal flow to the code block's top-right corner (a
 * hover-reveal row, not inline content). When the document caret
 * (`state.selection.main.head`) sits exactly at that shared anchor
 * position, CM6's cursor-rendering resolves the boundary to whichever
 * widget owns it and asks *that widget* for its coordinates — so, left
 * unfixed, the caret visually renders at the button's absolute-positioned
 * corner instead of staying next to the actual text. `state.selection`
 * itself is never wrong here; only the rendered caret position is —
 * confirmed directly via `coordsAtPos(pos, -1)` (correct, text-side) vs.
 * `coordsAtPos(pos, 1)` (wrong, matches the button's own rect) before this
 * fix existed.
 *
 * **The fix.** Report the position of whatever real, in-flow content
 * immediately precedes this widget instead of the widget's own displaced
 * box. Copy/Format/Actions can all be anchored at the exact same position
 * simultaneously (rendered left-to-right as Format, then Copy, then
 * Actions — see each widget's own doc comment) — CM6 places them as
 * adjacent sibling DOM nodes in that order, so only the *first* widget in
 * that cluster sits directly next to real content; the second and third
 * sit next to another widget button instead. Walking backward past any
 * number of `.cm-media-control` siblings finds the real content
 * regardless of which widget in the cluster is asked — usually CM6's own
 * `cm-widgetBuffer` marker (inserted for exactly this kind of
 * text/widget boundary), occasionally the fence-marker or language-info
 * text directly, on browsers/layouts where CM6 didn't need a buffer node
 * here.
 *
 * Returns `null` (CM6's own "fall back to the default" signal) if no such
 * sibling can be found — this should not normally happen for these three
 * widgets (they're never the first thing on their line), but degrades to
 * the pre-existing behavior rather than throwing.
 */
export function coordsAtFencedCodeControlWidget(dom: HTMLElement): Rect | null {
  let node: ChildNode | null = dom.previousSibling;
  while (node instanceof HTMLElement && node.classList.contains('cm-media-control')) {
    node = node.previousSibling;
  }
  return node ? trailingRectOf(node) : null;
}

function trailingRectOf(node: ChildNode): Rect | null {
  if (node instanceof Element) {
    const rects = node.getClientRects();
    return rects[rects.length - 1] ?? null;
  }
  if (node instanceof Text) {
    // A bare text node (no wrapping element) has no `getClientRects` of
    // its own — a zero-width `Range` collapsed at its end gives the exact
    // same "end of this text" point a wrapped element's own trailing rect
    // would.
    const range = document.createRange();
    range.setStart(node, node.length);
    range.setEnd(node, node.length);
    const rects = range.getClientRects();
    return rects[rects.length - 1] ?? range.getBoundingClientRect();
  }
  return null;
}
