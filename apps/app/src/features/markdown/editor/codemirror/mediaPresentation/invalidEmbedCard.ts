/**
 * The invalid-embed card — one small shared component used by every media
 * widget that can be broken (`ImageWidget.ts`, `PdfEmbedWidget.ts`,
 * `NoteEmbedWidget.ts`). Four static pieces, always the same shape — one
 * row, content on the left and controls on the right, never controls as
 * their own separate row ahead of the content:
 *
 *   container
 *   └── row
 *       ├── content
 *       │   ├── icon
 *       │   └── text
 *       │       ├── title ("Unable to load" / Note's own "Note not found")
 *       │       └── path/URL
 *       └── controls
 *           ├── Remove
 *           └── Edit source
 *
 * The only things that ever differ between media types are the icon and
 * (for Note, the one caller whose broken state isn't a load failure) the
 * title — plus the small wording differences already reflected in each
 * caller's own `removeLabel`/`editLabel` strings. The embed *type* only
 * ever configures what this card says/shows through `options` — it never
 * leaks into the rendered DOM's own CSS identity. This module owns the DOM
 * shape, every bit of its own layout/hover-reveal styling, and its own
 * `.cm-invalid-embed*` classes, `__controls`/`__control` included — all
 * BEM children of `.cm-invalid-embed` itself, not a name borrowed from
 * elsewhere. `container` (whatever element each caller's own `toDOM`
 * passes in) is given only `.cm-invalid-embed` here — deliberately never a
 * type-specific container class like `.cm-image-container`/
 * `.cm-pdf-embed`/`.cm-note-embed`, which each caller's own working state
 * alone still owns (added only inside its own `renderWorking`, never
 * before branching into this component). A broken embed genuinely isn't a
 * working one of that type — no nested view, no type-specific controls, no
 * type-specific layout — so it shouldn't claim that CSS identity merely as
 * a leftover styling dependency. The `.cm-media-block` global block-flow
 * class is the one thing every caller's own `toDOM` still adds
 * unconditionally before branching — that one's genuinely shared by every
 * media/embed state, broken or working alike (`mediaPresentation/
 * embedLayout.css`'s own doc comment). The actual button *chrome*
 * (sizing/color/hover/active/icon) still lives once in
 * `MediaFloatingControls.css`, targeting this component's own
 * `.cm-invalid-embed__controls`/`.cm-invalid-embed__control` names
 * directly — no second, type-scoped copy of it, and no dependency on any
 * container class beyond `.cm-invalid-embed` itself. `onRemove`/`onEdit`
 * are plain callbacks — this module has no opinion on what removing or
 * editing means for a given widget, and no CodeMirror/state dependency of
 * its own. `onRemove` in particular must only ever strip this embed's own
 * Markdown from the current note — never touch the underlying resource;
 * see `embedRemovalRange.ts`'s own doc comment for the Remove-vs-Archive
 * product rule every caller of this card follows.
 *
 * Fixes a real, confirmed bug: `PdfEmbedWidget.renderBroken` used to
 * build its controls with `.cm-pdf-controls` — the same class its
 * *working*-state controls use, whose buttons only ever reveal from
 * `opacity: 0` via a `.cm-pdf-embed-container:hover`/JS-toggled
 * `--hover` class that `renderBroken` never wires up. Remove/Edit source
 * existed in the DOM but sat permanently invisible. This shared
 * component's own self-contained `.cm-invalid-embed`/
 * `.cm-invalid-embed__controls` reveal mechanism — added here, not by each
 * widget, and never dependent on any type-specific class — sidesteps that
 * entirely.
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
  /** The media-specific broken icon — a broken-image glyph, a PDF/document glyph, or (Note) a note glyph. The one meaningful difference between most callers. */
  readonly icon: string;
  /** Primary status text. Defaults to `"Unable to load"` — Image/PDF's own wording for a genuine load failure; `NoteEmbedWidget.ts`'s own broken state (the referenced page doesn't exist, was never a load attempt) overrides it to `"Note not found"`. */
  readonly title?: string;
  /** The path/reference shown under the title. */
  readonly source: string;
  /** Removes this embed's Markdown from the current note only — never the underlying resource. See `embedRemovalRange.ts`'s own doc comment for the Remove-vs-Archive product rule. */
  readonly removeLabel: string;
  readonly onRemove: () => void;
  readonly editLabel: string;
  readonly onEdit: () => void;
}

/**
 * Appends one `.cm-invalid-embed__row` onto `container` — content (icon +
 * title/source) on the left, the Remove/Edit source controls on the right,
 * both flex children of the same single row — and adds the one class
 * (`.cm-invalid-embed`) its own styling/hover-reveal depend on. Never a
 * type-specific container class (`.cm-image-container`/`.cm-pdf-embed`/
 * `.cm-note-embed`) — see this module's own doc comment. Controls are no
 * longer a separate row/container ahead of the content (an earlier
 * revision built them as two independent children of `container`);
 * `content` carries `flex: 1 1 auto; min-width: 0` so a long title/source
 * truncates via its own existing ellipsis handling instead of pushing
 * `controls` off the row or overflowing it.
 */
export function renderInvalidEmbedCard(container: HTMLElement, options: InvalidEmbedCardOptions): void {
  container.classList.add('cm-invalid-embed');

  const row = document.createElement('div');
  row.classList.add('cm-invalid-embed__row');

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
  title.textContent = options.title ?? 'Unable to load';
  text.append(title);

  const source = document.createElement('span');
  source.classList.add('cm-invalid-embed__source');
  source.textContent = options.source;
  text.append(source);

  content.append(text);

  const controls = document.createElement('div');
  controls.classList.add('cm-invalid-embed__controls');
  controls.contentEditable = 'false';
  controls.append(
    buildControlButton(TRASH_ICON, options.removeLabel, options.onRemove),
    buildControlButton(EDIT_ICON, options.editLabel, options.onEdit)
  );

  row.append(content, controls);
  container.append(row);
}
