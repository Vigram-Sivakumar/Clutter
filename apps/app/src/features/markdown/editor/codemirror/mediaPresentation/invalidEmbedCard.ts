/**
 * The invalid-embed card — one small shared component used by every media
 * widget that can be broken (`ImageWidget.ts`, `PdfEmbedWidget.ts`). Four
 * static pieces, always the same shape:
 *
 *   container
 *   ├── controls
 *   │   ├── Delete
 *   │   └── Edit source
 *   └── content
 *       ├── icon
 *       └── text
 *           ├── "Unable to load"
 *           └── path/URL
 *
 * The only thing that ever differs between media types is the icon (plus
 * the small wording differences already reflected in each caller's own
 * `deleteLabel`/`editLabel` strings) — this module owns the DOM shape and
 * its own `.cm-invalid-embed*` classes, `__controls`/`__control` included
 * — matching every other element here (`__content`, `__icon-wrap`, etc.),
 * all BEM children of this one component, not a name borrowed from
 * elsewhere. The container additionally keeps the pre-existing
 * `.cm-image-container` class (unrenamed — it's a genuinely generic
 * "media container with floating controls" primitive, already reused
 * across widget types for the *working* state too) purely so the existing
 * `.cm-image-container:hover`/`:focus-within` reveal-on-hover mechanism
 * keeps applying here without a second copy of it — `MarkdownEditor.css`'s
 * reveal rule targets both `.cm-media-controls` (the *working*-state
 * controls' own name, `ImageWidget.ts`) and this component's own
 * `.cm-invalid-embed__controls`. The actual button/container *chrome*
 * (background/shadow/padding, icon-button sizing/hover) still lives once
 * in `MediaFloatingControls.css`, whose selectors list both class families
 * — one visual system, two semantically-owned names, no duplicated CSS.
 * `onDelete`/`onEdit` are plain callbacks — this module has no opinion on
 * what deleting or editing means for a given widget, and no CodeMirror/
 * state dependency of its own.
 *
 * Fixes a real, confirmed bug: `PdfEmbedWidget.renderBroken` used to
 * build its controls with `.cm-pdf-controls` — the same class its
 * *working*-state controls use, whose buttons only ever reveal from
 * `opacity: 0` via a `.cm-pdf-embed-container:hover`/JS-toggled
 * `--hover` class that `renderBroken` never wires up. Delete/Edit source
 * existed in the DOM but sat permanently invisible. Using this shared
 * component's own `.cm-image-container`/`.cm-invalid-embed__controls` —
 * added here, not by each widget — sidesteps that entirely.
 */

const TRASH_ICON =
  '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13 4L12.1801 12.199C12.0779 13.2214 11.2175 14 10.19 14H5.80998C4.78247 14 3.92214 13.2214 3.8199 12.199L3 4M13 4H14M13 4H10.5M3 4H2M3 4H5.5M10.5 4H5.5M10.5 4C10.5 2.89543 9.60457 2 8.5 2H7.5C6.39543 2 5.5 2.89543 5.5 4" stroke="currentColor" stroke-linecap="round"/></svg>';

/** Also used by `ImageWidget.ts`/`PdfEmbedWidget.ts`'s own *working*-state Edit source button — identical glyph, one definition. */
export const EDIT_ICON =
  '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.625 4L3.64738 9.30947C3.22603 9.7589 2.95326 10.3272 2.86614 10.937L2.64142 12.5101C2.57071 13.005 2.99497 13.4293 3.48995 13.3586L4.95655 13.1491C5.63195 13.0526 6.25428 12.7288 6.7209 12.231L11.625 7M8.625 4L9.79364 2.75345C10.18 2.34132 10.831 2.33098 11.2304 2.73044C11.7865 3.28654 12.2541 3.75413 12.8152 4.31518C13.1968 4.69683 13.2069 5.31263 12.8378 5.70638L11.625 7M8.625 4L11.625 7" stroke="currentColor" stroke-linecap="round"/><path d="M8 13.5H13.5" stroke="currentColor" stroke-linecap="round"/></svg>';

function buildControlButton(iconHtml: string, label: string, onActivate: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('cm-invalid-embed__control');
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = iconHtml;
  button.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onActivate();
  });
  return button;
}

export interface InvalidEmbedCardOptions {
  /** The media-specific broken icon — a broken-image glyph or a PDF/document glyph. The one meaningful difference between callers. */
  readonly icon: string;
  /** The path/URL shown under the "Unable to load" title. */
  readonly source: string;
  readonly deleteLabel: string;
  readonly onDelete: () => void;
  readonly editLabel: string;
  readonly onEdit: () => void;
}

/** Appends the controls row and the invalid-embed content onto `container`, and adds the `.cm-image-container`/`.cm-invalid-embed` classes its styling/hover-reveal depend on. */
export function renderInvalidEmbedCard(container: HTMLElement, options: InvalidEmbedCardOptions): void {
  container.classList.add('cm-image-container', 'cm-invalid-embed');

  const controls = document.createElement('div');
  controls.classList.add('cm-invalid-embed__controls');
  controls.contentEditable = 'false';
  controls.append(
    buildControlButton(TRASH_ICON, options.deleteLabel, options.onDelete),
    buildControlButton(EDIT_ICON, options.editLabel, options.onEdit)
  );

  const content = document.createElement('div');
  content.classList.add('cm-invalid-embed__content');

  const iconWrap = document.createElement('span');
  iconWrap.classList.add('cm-invalid-embed__icon-wrap');
  iconWrap.innerHTML = options.icon;
  iconWrap.querySelector('svg')?.classList.add('cm-invalid-embed__icon');
  content.append(iconWrap);

  const text = document.createElement('div');
  text.classList.add('cm-invalid-embed__text');

  const title = document.createElement('span');
  title.classList.add('cm-invalid-embed__title');
  title.textContent = 'Unable to load';
  text.append(title);

  const source = document.createElement('span');
  source.classList.add('cm-invalid-embed__source');
  source.textContent = options.source;
  text.append(source);

  content.append(text);
  container.append(controls, content);
}
