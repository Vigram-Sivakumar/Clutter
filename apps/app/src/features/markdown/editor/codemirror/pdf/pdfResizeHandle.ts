import type { EditorView } from '@codemirror/view';

import { computePdfPresentationUpdate, getPdfPresentation } from '../mediaPresentation/mediaPresentationUpdate';
import { clampMediaWidth, measureBox } from '../mediaPresentation/mediaLayoutStyle';
import { presentationOnlyEdit } from '../image/imageUiState';

/**
 * Custom pointer-driven resize for the inline PDF embed
 * (`PdfEmbedWidget.ts`) — the PDF counterpart to `image/imageResizeHandle.ts`,
 * following the same architecture (pointerdown → pointermove mutates the
 * live DOM only → pointerup commits exactly one CM6 transaction) but a
 * deliberately separate, PDF-specific module: a PDF embed has no
 * Fill/Fit mode, no persisted `height` field at all
 * (`mediaPresentationModel.ts`'s `PdfPresentation` — width + alignment
 * only), and a materially different rendering pipeline (PDF.js canvas +
 * text-layer, fit-scaled from the page's own natural aspect ratio) — see
 * this module's own "why no live re-render" account below. Reuses
 * `clampMediaWidth`/`measureBox` from the shared `mediaLayoutStyle.ts`
 * both widgets already depend on (the same clamp `applyMediaWidth`
 * itself uses), never anything from `image/imageResizeHandle.ts` — the
 * two resize implementations are intentionally uncoupled beyond that
 * pre-existing shared layer.
 *
 * **Width-only, always — there is no height to independently resize.**
 * `PdfEmbedWidget.ts`'s own `renderCurrentPage` always derives the
 * rendered page's height from `computeFitScale(availableWidth,
 * baseWidth)` — the page's own natural aspect ratio scaled to whatever
 * width is available — so aspect ratio is preserved structurally: this
 * module never computes, reads, or writes a height value anywhere.
 *
 * **Why the live drag never triggers a real PDF.js re-render (no
 * "PDF.js re-rendering during pointermove").** `PdfEmbedWidget.ts`
 * already runs a `ResizeObserver` on its `pageHost` element specifically
 * to re-render the current page whenever the *editor column* resizes —
 * and `pageHost`'s own measured width tracks `container`'s width via
 * ordinary block-flow layout (no explicit `width: 100%` needed), so
 * mutating `container.style.width` on every `pointermove` would already
 * re-trigger that same observer on every single tick, reproducing
 * exactly the flicker/overlapping-render problem an earlier interactive
 * PDF/image resize implementation was removed for (`4711c187`). This
 * module never creates or drives its own `ResizeObserver` — it instead
 * calls `hooks.onResizeStart()`/`hooks.onResizeEnd()` so
 * `PdfEmbedWidget.ts`'s own `renderWorking` can pause that *existing*
 * observer's callback for exactly the drag's duration and force exactly
 * one settle-render at the final width once the drag ends — "after the
 * final [width] the normal PDF rendering/layout system... settle[s] to
 * the new width," never mid-drag.
 *
 * **Live visual responsiveness during the drag, without any PDF.js
 * involvement — including the *container's own height*.** Unlike an
 * `<img>` (`width: 100%; height: auto`), nothing in the rendered page's
 * chain has real *layout* dimensions tied to the container's width:
 * `pdfPageRenderer.ts` sets the canvas's CSS box in absolute pixels
 * matching the *last real render's* fit scale, and `.pdf-viewer__page`
 * (`pageWrap`) is `width: fit-content` with no height rule of its own —
 * it just shrink-wraps to whatever fixed size the canvas happens to be.
 * `.cm-pdf-embed-page` (`pageHost`) has no explicit height either, so its
 * own rendered height (and therefore the outer `.cm-pdf-embed-container`'s
 * own overall height) is *entirely* derived from `pageWrap`'s real layout
 * box. A first version of this fix applied a `transform: scale(...)` to
 * `pageWrap` — **confirmed wrong**: `transform` is paint-only and never
 * participates in layout, so it left `pageWrap`'s real box (and therefore
 * `pageHost`'s and `container`'s own heights) completely frozen during
 * the drag — only the container's *width* ever visibly changed.
 *
 * The actual fix gives `pageWrap` a genuine **layout** width/height for
 * the drag's duration, computed to preserve the page's own aspect ratio
 * (read straight off the canvas's own intrinsic pixel-buffer dimensions,
 * `canvas.width`/`canvas.height` — always correct regardless of any CSS
 * override, no separate bookkeeping needed), and makes the canvas's
 * existing raster stretch to fill that box via ordinary percentage CSS
 * sizing (`width: 100%; height: 100%`) — the same "browser stretches
 * existing raster content" behavior an `<img>` gets for free, applied
 * explicitly here. Setting `pageWrap`'s own inline `width`/`height`
 * overrides its `width: fit-content` default (which has no competing
 * height rule to fight) with a real box; that real height propagates up
 * through `pageHost`'s auto-height to `container`'s own auto-height —
 * genuine reflow, not merely a repaint. `.textLayer` needs no attention:
 * it's `position: absolute; inset: 0` inside `pageWrap`, so its own outer
 * box already tracks `pageWrap`'s new size for free, and its transparent
 * text spans being momentarily stale (still positioned for the old scale)
 * is invisible — nothing user-visible reads their exact position during a
 * drag.
 *
 * Read via the live `hooks.getPageWrap()` hook, never a captured
 * reference — `renderCurrentPage()` replaces `pageWrap` (and its canvas)
 * with brand-new elements on every real render, so a stale reference
 * would silently stop working the moment one occurs. On drag-end, no
 * explicit cleanup of any inline override is needed for the same reason:
 * `renderCurrentPage()` (called from `onResizeEnd`) always mounts a
 * wholesale *new* `pageWrap`/canvas and replaces `pageHost`'s children
 * with them, discarding every inline style the drag applied along with
 * the old elements — the temporary preview is replaced by construction,
 * not by resetting styles.
 */
export type PdfResizeSide = 'left' | 'right';

export interface PdfResizeHooks {
  /** Called once, synchronously, at the start of a drag (before the first `pointermove`) — lets the widget suppress its own width-driven re-render for the drag's duration. */
  onResizeStart(): void;
  /** Called once, synchronously, when a drag ends (`pointerup`, `pointercancel`, or lost pointer capture) — after the container's own live width already reflects its final value. Lets the widget resume normal rendering and settle the current page to that final width. Never called if a drag never actually started. */
  onResizeEnd(): void;
  /**
   * Returns the *currently mounted* `.pdf-viewer__page` element, or
   * `null` if none exists yet (still loading, or broken) — read fresh on
   * every `pointermove`, never captured once, since a real re-render
   * (e.g. a page-nav click mid-drag, however unlikely) replaces this
   * element wholesale.
   */
  getPageWrap(): HTMLElement | null;
}

/**
 * Wires one bottom-corner resize handle to drag-resize `container`'s
 * width only. `side` only affects the pointer math — dragging the left
 * corner further left grows the width, mirroring the right corner's
 * further-right convention, exactly like `image/imageResizeHandle.ts`'s
 * own left/right handling (see that module's doc comment for why this
 * is "different pointer math," never a different visual handle — the
 * same shared `.cm-image-resize-handle--corner-left`/`--corner-right`
 * CSS classes are reused verbatim here, per this milestone's own
 * "same visual handle design" requirement).
 */
export function attachPdfResizeHandle(
  handle: HTMLElement,
  container: HTMLElement,
  side: PdfResizeSide,
  view: EditorView,
  getTo: () => number,
  hooks: PdfResizeHooks
): void {
  handle.contentEditable = 'false';

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startWidth = container.getBoundingClientRect().width;
    const startX = event.clientX;
    let active = true;

    // Captured once, before any mutation — `pageWrap`'s own current
    // rendered width (== `computeFitScale`'s `availableWidth` at the last
    // real render, per that function's own `availableWidth / pageBaseWidth`
    // contract) is the reference this drag scales proportionally against.
    // `null` if no page is mounted yet (still loading/broken) — the drag
    // still resizes the container in that case, just with no page-height
    // preview to drive (nothing rendered yet to preserve the ratio of).
    const startPageWrapWidth = hooks.getPageWrap()?.getBoundingClientRect().width ?? 0;

    // Optional chaining — see `imageResizeHandle.ts`'s identical comment:
    // standard in every real target browser, absent in jsdom (this
    // project's own test environment); the drag still works correctly
    // without it, capture only additionally protects against the pointer
    // briefly leaving the handle's own small hit area mid-drag.
    handle.setPointerCapture?.(event.pointerId);
    document.body.classList.add(side === 'right' ? 'cm-image-resizing-nwse' : 'cm-image-resizing-nesw');
    hooks.onResizeStart();

    const onMove = (moveEvent: PointerEvent) => {
      const rawDeltaX = moveEvent.clientX - startX;
      // Left corner: dragging further left (negative delta) grows the
      // width, mirroring the right corner's further-right convention.
      const deltaX = side === 'left' ? -rawDeltaX : rawDeltaX;
      const width = clampMediaWidth(view, startWidth + deltaX);
      container.style.width = `${width}px`;

      // Live visual preview — see the class doc comment's "Live visual
      // responsiveness" section for the full rationale: a real layout
      // width/height on `pageWrap` (never just a paint-only transform),
      // so `pageHost`'s/`container`'s own auto-heights genuinely reflow
      // in step with the drag, not only the container's width.
      const pageWrap = hooks.getPageWrap();
      const canvas = pageWrap?.querySelector<HTMLCanvasElement>('canvas') ?? null;
      if (pageWrap && canvas && startWidth > 0 && startPageWrapWidth > 0 && canvas.height > 0) {
        const aspectRatio = canvas.width / canvas.height;
        const factor = width / startWidth;
        const newPageWrapWidth = startPageWrapWidth * factor;
        const newPageWrapHeight = newPageWrapWidth / aspectRatio;
        pageWrap.style.width = `${newPageWrapWidth}px`;
        pageWrap.style.height = `${newPageWrapHeight}px`;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
      }
    };

    // Shared end-of-drag path for `pointerup`, `pointercancel`, and a
    // `lostpointercapture` event with no matching `pointerup`/
    // `pointercancel` (the "lost pointer capture safely" requirement —
    // per the Pointer Events spec this fires whenever capture ends for
    // *any* reason, including ones neither of the other two events
    // cover, e.g. the handle being removed from the DOM mid-drag). The
    // `active` guard makes this idempotent regardless of which
    // event(s) actually fire, or in what order/combination — every path
    // removes every listener and calls `hooks.onResizeEnd()` at most
    // once, so a drag can never leave the widget's own re-render
    // permanently suppressed.
    const finish = (endEvent: PointerEvent) => {
      if (!active) {
        return;
      }
      active = false;
      handle.releasePointerCapture?.(endEvent.pointerId);
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', finish);
      handle.removeEventListener('pointercancel', finish);
      handle.removeEventListener('lostpointercapture', finish);
      document.body.classList.remove('cm-image-resizing-nwse', 'cm-image-resizing-nesw');

      hooks.onResizeEnd();

      const to = getTo();
      const current = getPdfPresentation(view.state, to);
      const finalWidth = Math.max(1, Math.round(measureBox(container).width));
      const next = { ...current, width: finalWidth };

      const changes = computePdfPresentationUpdate(view.state, to, next);
      if (changes.from === changes.to && changes.insert === '') {
        // The Embed node this handle was attached to no longer resolves
        // at `to` (e.g. deleted mid-drag) — nothing to persist.
        return;
      }

      view.dispatch({
        effects: [presentationOnlyEdit.of(null)],
        changes,
      });
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
    handle.addEventListener('lostpointercapture', finish);
  });
}
