import { EditorSelection } from '@codemirror/state';
import { WidgetType, type EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

import './NoteEmbedWidget.css';
import { createEditorView } from '../createEditorView';
import { setImageUiState, type ImageUiState } from '../image/imageUiState';
import { EXPAND_ICON, MORE_ICON } from '../mediaPresentation/embedControlIcons';
import { EDIT_ICON, renderInvalidEmbedCard } from '../mediaPresentation/invalidEmbedCard';
import { computeEmbedRemovalRange } from '../mediaPresentation/embedRemovalRange';
import type { PageEmbedResolution } from '../../../render/blocks/pageEmbedResolution';

// Hand-copied from `shared/icon/svg/note.svg` (this project's own existing
// icon for "note"/page content) — same reason `ImageWidget.ts`'s
// `BROKEN_IMAGE_ICON`/`PdfEmbedWidget.ts`'s `BROKEN_PDF_ICON` are hand-
// copied rather than imported: the real icon system
// (`shared/icon/iconRegistry.ts`) emits React components, which cannot
// mount inside a `WidgetType`'s plain DOM.
const NOTE_MISSING_ICON =
  '<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 4C2 2.34315 3.34315 1 5 1H11C12.6569 1 14 2.34315 14 4V12C14 13.6569 12.6569 15 11 15H5C3.34315 15 2 13.6569 2 12V4Z" stroke="currentColor" stroke-linecap="round"/><path d="M5 8H11M5 11H11" stroke="currentColor" stroke-linecap="round"/><path d="M5 5H9H5" stroke="currentColor" stroke-linecap="round"/></svg>';

/**
 * Invoked with the embed's own `Embed` node position when the "More
 * actions" control is activated — the app layer (`MarkdownEditor.tsx`)
 * opens `NoteEmbedMoreActions.tsx`, anchored to the given button. Same
 * injected-getter shape as `OnPdfEmbedClick`/`OnOpenPdfMenu`. `to` is
 * included for parity with `OpenPdfMenuParams` even though this widget
 * never needs a *live* `to` reader the way Image/PDF do (no presentation/
 * resize state that can shift it independently of a full rebuild — see
 * this file's own class doc comment).
 */
export interface OpenNoteEmbedMenuParams {
  readonly anchor: HTMLElement;
  readonly pos: number;
  readonly to: number;
}

export type OnOpenNoteEmbedMenu = (params: OpenNoteEmbedMenuParams) => void;

/**
 * A note embed (`![[Page]]`, `![[Page#Heading]]`) — renders the resolved
 * page's (or page section's) content through a real, nested, permanently
 * read-only CM6 `EditorView`, not a hand-built parallel DOM renderer.
 * This is a deliberate architectural choice, confirmed by direct
 * investigation (docs/editor-architecture-decisions.md): CM6's own
 * decoration/widget system (headings, emphasis, image sizing/alignment,
 * PDF embeds, task checkboxes) is fundamentally tied to a live
 * `EditorView`/`view.state`/`view.visibleRanges` — there is no headless
 * way to produce "just the decorations." A second, hand-rolled renderer
 * would inevitably drift from the real one; a nested `EditorView`, built
 * from the exact same shared extension list `buildEditorExtensions.ts`
 * gives the top-level `MarkdownEditor` (`embed/embedLivePreview.ts`
 * constructs this widget's `extensions` from that same factory, with
 * `readOnly: true`), cannot drift, by construction.
 *
 * "Permanently read-only" is enforced twice, independently, matching
 * `createEditorView.ts`'s own two-layer contract: `readOnly: true` there
 * sets both `EditorState.readOnly`/`EditorView.editable.of(false)` (the
 * DOM/rendering layer — `contenteditable="false"`, which
 * `MarkdownEditor.css`'s note-embed rules also key their own
 * mutation-control-hiding off) and installs `blockReadOnlyEdits` (the
 * actual enforcement — a `transactionFilter` that drops any
 * doc-changing transaction unconditionally). Neither is this widget's own
 * concern; it only ever constructs the nested view with `readOnly: true`
 * and never toggles it.
 *
 * Follows `PdfEmbedWidget.ts`'s own established structure closely (a top
 * header row — title + Expand/Edit source/More actions, hover/focus-reveal
 * — above the rendered content), with three deliberate differences:
 *
 * 1. **The title is plain, non-interactive text** (`.cm-note-embed__title`,
 *    a `<span>`, never a `<button>`) — an earlier revision made it a
 *    clickable "open source note" affordance; that behavior is now the
 *    dedicated Expand control instead, matching Image/PDF's own
 *    convention of a separate, explicit Expand action rather than
 *    overloading the title/content with navigation.
 * 2. **The action-button row reuses the truly shared
 *    `.cm-media-control` chrome** (`MediaFloatingControls.css`, the same
 *    button appearance `ImageWidget.ts`'s working-state controls and
 *    every broken/invalid-embed card already use) rather than a third,
 *    parallel button-chrome system the way `PdfEmbedWidget.ts`'s own
 *    self-contained `.cm-pdf-control` is. Only the row's own wrapper
 *    (`.cm-note-embed__controls`) and its read-only mutating-marker class
 *    (`.cm-note-embed-control--mutating`) are note-embed-specific — see
 *    `NoteEmbedWidget.css`'s own doc comment for why the wrapper can't
 *    just be the shared `.cm-media-controls` name (that class is
 *    unconditionally hidden inside a read-only view; Expand must survive
 *    that, matching requirement 6 below).
 * 3. **Expand opens the real source note via `getOnOpenPage`** —
 *    `pageOperations.open(pageId)`, the exact existing navigation
 *    mechanism (not an overlay, not a new preview surface) — rather than
 *    Image/PDF's own overlay-opening `getOnImageClick`/`getOnPdfEmbedClick`.
 *
 * **Edit source** reuses the exact same `imageUiState.ts`
 * (`getImageUiState`/`setImageUiState`) reveal mechanism Image/PDF already
 * establish — `ui.revealed` toggles whether `embedLivePreview.ts` renders
 * this widget as a `Decoration.replace` (collapsed) or a
 * `Decoration.widget` inserted after the still-visible raw `![[Note]]`
 * text (revealed) — never a second, parallel state system. Toggling only
 * ever edits *this* note's own Markdown text (the embed reference); the
 * source note is never touched.
 *
 * **More actions** (`NoteEmbedMoreActions.tsx`) is a note-embed-specific
 * menu — "Turn into WikiLink" (strips the leading `!`, turning
 * `![[Note]]` into `[[Note]]`, purely a text edit in this note) and
 * "Remove" (strips the whole embed via `computeEmbedRemovalRange`, the
 * same shared removal-range primitive Image/PDF already use) — never a
 * source-resource menu, since a note embed has no `VaultResource` behind
 * it at all.
 *
 * **Read-only nested embeds** (requirement 6): when this widget itself
 * renders inside another permanently read-only note embed's own nested
 * view, Edit source and More actions must hide while Expand stays —
 * exactly Image/PDF's own established mechanism, reused verbatim, not
 * reimplemented: `editButton`/`moreActionsButton` get the
 * `.cm-note-embed-control--mutating` marker class, and
 * `mediaPresentation/embedLayout.css`'s existing
 * `.cm-content[contenteditable='false']` rule (already hiding
 * `.cm-media-controls`/`.cm-pdf-control--mutating`/
 * `.cm-invalid-embed__controls`) hides this marker too — see that CSS
 * rule's own doc comment. `embedLivePreview.ts`'s nested-extension
 * construction also stubs `onOpenNoteEmbedMenu`/leaves Edit source
 * reachable-but-hidden the same way it already stubs `onOpenImageMenu`/
 * `onOpenPdfMenu` for a nested embed — defense in depth, not the only
 * barrier (the CSS is the one requirement 6 actually depends on, same
 * caveat already recorded for Image/PDF's own reveal-toggle in the prior
 * read-only-behavior audit).
 */
export class NoteEmbedWidget extends WidgetType {
  private nestedView: EditorView | null = null;

  constructor(
    /** `null` for a broken embed — the target never resolved to a real page (or resolved but was rejected for a cycle/depth reason), rendered via `renderBroken` below instead of the resolved-page working state. */
    readonly resolution: Extract<PageEmbedResolution, { status: 'resolved' }> | null,
    /** The raw, unresolved embed target text (`match.path` from `embedLivePreview.ts`'s own scan) — always present, but only ever shown to the user as the broken card's own secondary text (`renderBroken` below); the working state shows `resolution.title` instead. */
    readonly path: string,
    readonly extensions: readonly Extension[],
    readonly ui: ImageUiState,
    readonly pos: number,
    readonly to: number,
    readonly getOnOpenPage: () => ((pageId: string) => void) | undefined,
    readonly getOnOpenNoteEmbedMenu: () => OnOpenNoteEmbedMenu | undefined
  ) {
    super();
  }

  override eq(other: NoteEmbedWidget): boolean {
    // Deliberately not comparing `extensions` (a fresh array reference
    // every decoration rebuild, from `buildEditorExtensions()` — see that
    // factory's own doc comment) or the getter closures (fresh per
    // rebuild too, same freshness pattern every other widget's injected
    // callback already follows).
    if (
      this.path !== other.path ||
      this.pos !== other.pos ||
      this.to !== other.to ||
      this.ui.revealed !== other.ui.revealed ||
      this.ui.broken !== other.ui.broken
    ) {
      return false;
    }
    if (this.resolution === null || other.resolution === null) {
      return this.resolution === other.resolution;
    }
    return (
      this.resolution.pageId === other.resolution.pageId &&
      this.resolution.title === other.resolution.title &&
      this.resolution.markdown === other.resolution.markdown
    );
  }

  override toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    // `cm-media-block` — see `ImageWidget.ts`'s own `toDOM` doc comment
    // and `mediaPresentation/embedLayout.css`'s own doc comment for the
    // shared global media/embed block-flow contract this class enforces.
    // Deliberately the ONLY class added before branching below —
    // `cm-note-embed` is added only inside the working-state branch,
    // never here: a broken note embed renders through the shared, generic
    // `renderInvalidEmbedCard` component instead (`invalidEmbedCard.ts`),
    // which owns its own `.cm-invalid-embed` identity and must never
    // additionally claim to be a working `.cm-note-embed` it isn't — see
    // that module's own doc comment.
    container.classList.add('cm-media-block');

    if (this.resolution === null) {
      return this.renderBroken(container, view);
    }
    // Captured as a local — `this.resolution` is `readonly`, but TS can't
    // carry the null-check narrowing above into the click closures below
    // (they run later, on activation, not synchronously here).
    const resolution = this.resolution;

    // The working-state container identity — added only here, never
    // above before branching; see this method's own doc comment for why.
    container.classList.add('cm-note-embed');
    container.contentEditable = 'false';
    // `[data-menu-open]` — see `ImageWidget.ts`'s own `renderWorking` doc
    // comment and `MarkdownEditor.tsx`'s `setNoteEmbedMenuButtonOpen` for
    // the DOM-mutation mechanism this initializes; `NoteEmbedWidget.css`'s
    // own `[data-menu-open='true']` rule is what actually keeps
    // `.cm-note-embed__controls` visible while More actions is open. Not
    // meaningful for `renderBroken`'s own card — no More actions/size menu
    // exists there at all, same as Image/PDF's own broken state.
    container.dataset.menuOpen = 'false';

    const header = document.createElement('div');
    header.classList.add('cm-note-embed__header');

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('cm-note-embed__title');
    titleSpan.textContent = resolution.title;
    titleSpan.title = resolution.title;

    const controls = document.createElement('div');
    controls.classList.add('cm-note-embed__controls');
    controls.contentEditable = 'false';

    const expandButton = this.makeButton(EXPAND_ICON, 'Expand', () => {
      this.getOnOpenPage()?.(resolution.pageId);
    });
    const editButton = this.makeButton(EDIT_ICON, this.ui.revealed ? 'Hide source' : 'Edit source', () => {
      const revealing = !this.ui.revealed;
      view.dispatch({
        effects: setImageUiState.of({ pos: this.pos, to: this.to, state: { ...this.ui, revealed: revealing } }),
        selection: revealing ? EditorSelection.cursor(this.to) : undefined,
        scrollIntoView: revealing,
      });
    });
    const moreActionsButton = this.makeButton(MORE_ICON, 'More actions', () => {
      this.getOnOpenNoteEmbedMenu()?.({ anchor: moreActionsButton, pos: this.pos, to: this.to });
    });
    // `--mutating` distinguishes the two content-changing controls (Edit
    // source reveals editable raw Markdown; More actions includes Turn
    // into WikiLink/Remove) from Expand (pure navigation, opens the real
    // source note) — see this class's own doc comment, requirement 6.
    editButton.classList.add('cm-note-embed-control--mutating');
    moreActionsButton.classList.add('cm-note-embed-control--mutating');
    // Expand, then Edit source, then More actions last — matching
    // PdfEmbedWidget.ts's own corrected control order.
    controls.append(expandButton, editButton, moreActionsButton);

    header.append(titleSpan, controls);

    const content = document.createElement('div');
    content.classList.add('cm-note-embed__content');

    container.append(header, content);

    this.nestedView = createEditorView({
      doc: this.resolution.markdown,
      parent: content,
      readOnly: true,
      extensions: this.extensions,
    });

    return container;
  }

  /**
   * The broken/unresolved-target state — `![[Page]]` names a page that no
   * longer exists (deleted, renamed, or simply never existed), rendered via
   * the exact shared `renderInvalidEmbedCard` component (`invalidEmbedCard.ts`)
   * `ImageWidget.ts`/`PdfEmbedWidget.ts`'s own `renderBroken` already use —
   * never a separate, duplicated invalid-card implementation. Only the icon
   * (`NOTE_MISSING_ICON`) and title (`"Note not found"`, overriding the
   * shared default `"Unable to load"` — see `invalidEmbedCard.ts`'s own
   * `title` option doc comment) are note-specific; `source` is `this.path`,
   * the raw, still-unresolved reference text itself (there is no resolved
   * page to derive a title from). No More actions/size menu here at all —
   * matching Image/PDF's own broken-card requirement — only Remove and Edit
   * source.
   */
  private renderBroken(container: HTMLElement, view: EditorView): HTMLElement {
    renderInvalidEmbedCard(container, {
      icon: NOTE_MISSING_ICON,
      title: 'Note not found',
      source: this.path,
      removeLabel: 'Remove embed',
      onRemove: () => {
        const { from, to } = computeEmbedRemovalRange(view.state, this.pos);
        view.dispatch({ changes: { from, to, insert: '' } });
      },
      editLabel: this.ui.revealed ? 'Hide source' : 'Edit source',
      onEdit: () => {
        const revealing = !this.ui.revealed;
        view.dispatch({
          effects: setImageUiState.of({ pos: this.pos, to: this.to, state: { ...this.ui, revealed: revealing } }),
          selection: revealing ? EditorSelection.cursor(this.to) : undefined,
          scrollIntoView: revealing,
        });
      },
    });

    return container;
  }

  override destroy(): void {
    this.nestedView?.destroy();
    this.nestedView = null;
  }

  override ignoreEvent(): boolean {
    return false;
  }

  /** Builds one floating control button using the shared `.cm-media-control` chrome (`MediaFloatingControls.css`) — the same visual system `ImageWidget.ts`'s own working-state controls use, not a note-embed-specific button style. */
  private makeButton(iconHtml: string, label: string, onActivate: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.classList.add('cm-media-control');
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
}
