/**
 * The invalid/broken-media card's single shared rendering implementation —
 * `ImageWidget.renderBroken`'s own layout, now used by every media widget
 * that can be broken (`ImageWidget.ts`, `PdfEmbedWidget.ts`), rather than
 * each hand-duplicating the same DOM shape. Before this extraction, both
 * widgets independently built an identical controls row (Delete + Edit
 * source) and an identical icon/title/hint card — differing only in the
 * icon glyph, the delete button's label, and the hint text — which is
 * exactly the kind of duplication that lets the two drift out of sync
 * (the concrete case that motivated this: `PdfEmbedWidget.ts` had been
 * showing `ImageWidget.ts`'s own broken-*image* icon for a broken *PDF*).
 *
 * Structure, entirely owned here:
 * - a controls row (Delete, then Edit source/Hide source)
 * - the broken card itself: an icon, then a text wrapper grouping the
 *   "Unable to load" title with the path/source hint (a plain flex row,
 *   vertically centered — not stacked — per the current design)
 *
 * What's genuinely media-specific, supplied as configuration rather than
 * hardcoded:
 * - `brokenIconHtml` — the one visual difference the whole thing exists
 *   to isolate (a broken-image glyph vs. a PDF/document glyph).
 * - `hintText` / `deleteLabel` — the path/URL shown, and "Delete image"
 *   vs. "Delete embed" wording.
 * - `controlsClassName` / `makeButton` — each widget's own existing
 *   control-button chrome (`.cm-image-control`/`.cm-image-controls` vs.
 *   `.cm-pdf-control`/`.cm-pdf-controls`) is left entirely alone here,
 *   including whatever hover-reveal mechanism each widget's own CSS
 *   already wires up for its own controls class — this extraction only
 *   consolidates the DOM-*shape*-building code, never a widget's own
 *   established button styling.
 * - `editButton` — built by the caller's own existing `makeEditButton`
 *   (unchanged; it's already shared, working-state-and-broken-state-alike,
 *   logic per widget), not rebuilt here.
 *
 * Deliberately never renders anything from a working-state control set
 * (no size/mode menu, no "More actions," no pagination) — a broken media
 * reference offers exactly Delete and Edit source, in both widgets,
 * unconditionally.
 */

const TRASH_ICON =
  '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 4L12.1801 12.199C12.0779 13.2214 11.2175 14 10.19 14H5.80998C4.78247 14 3.92214 13.2214 3.8199 12.199L3 4M13 4H14M13 4H10.5M3 4H2M3 4H5.5M10.5 4H5.5M10.5 4C10.5 2.89543 9.60457 2 8.5 2H7.5C6.39543 2 5.5 2.89543 5.5 4" stroke="currentColor" stroke-linecap="round"/></svg>';

export interface RenderInvalidMediaCardOptions {
  /** The controls row's own container class — each widget's existing `.cm-image-controls`/`.cm-pdf-controls`, never a new one. */
  readonly controlsClassName: string;
  /** Each widget's own existing control-button builder (`ImageWidget.makeButton`/`PdfEmbedWidget.makeButton`) — reused as-is, so Delete gets the exact same chrome/behavior every other control in that widget already has. */
  readonly makeButton: (iconHtml: string, label: string, onActivate: () => void) => HTMLButtonElement;
  /** "Delete image" vs. "Delete embed" — the one Delete-specific wording difference. */
  readonly deleteLabel: string;
  readonly onDelete: () => void;
  /** Already built by the caller's own `makeEditButton` — this function only places it, never constructs it. */
  readonly editButton: HTMLButtonElement;
  /** The media-specific broken icon — a broken-image glyph or a PDF/document glyph. The one visual difference this whole module exists to isolate. */
  readonly brokenIconHtml: string;
  /** The path/URL shown under the "Unable to load" title. */
  readonly hintText: string;
}

/** Appends the controls row and the broken card itself onto `container` — mirrors `renderWorking`'s own "mutate the passed-in container" convention in both widgets, rather than returning a detached fragment. */
export function renderInvalidMediaCard(container: HTMLElement, options: RenderInvalidMediaCardOptions): void {
  const controls = document.createElement('div');
  controls.classList.add(options.controlsClassName);
  controls.contentEditable = 'false';

  const deleteButton = options.makeButton(TRASH_ICON, options.deleteLabel, options.onDelete);
  // No size/mode/More-actions/pagination controls here at all — a broken
  // media reference never offers anything beyond Delete and Edit source,
  // in either widget.
  controls.append(deleteButton, options.editButton);

  const broken = document.createElement('div');
  broken.classList.add('cm-image-broken');

  // A 24x24 wrapper around the 16x16 icon — matches the controls' own
  // buttons' icon-button proportions for visual rhythm, even though this
  // icon isn't itself interactive.
  const iconWrap = document.createElement('span');
  iconWrap.classList.add('cm-image-broken__icon-wrap');
  iconWrap.innerHTML = options.brokenIconHtml;
  iconWrap.querySelector('svg')?.classList.add('cm-image-broken__icon');
  broken.append(iconWrap);

  // Groups the title and the hint together as one unit the icon sits
  // beside — a plain row (not a column: title and hint sit side by side,
  // vertically centered), matching the current design exactly.
  const textWrap = document.createElement('div');
  textWrap.classList.add('cm-image-broken__text');

  const altSpan = document.createElement('span');
  altSpan.classList.add('cm-image-broken__alt');
  altSpan.textContent = 'Unable to load';
  textWrap.append(altSpan);

  const hintSpan = document.createElement('span');
  hintSpan.classList.add('cm-image-broken__hint');
  hintSpan.textContent = options.hintText;
  textWrap.append(hintSpan);

  broken.append(textWrap);

  container.append(controls, broken);
}
