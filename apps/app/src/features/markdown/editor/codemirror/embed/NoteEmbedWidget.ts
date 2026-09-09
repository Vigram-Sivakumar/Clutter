import { EditorSelection } from '@codemirror/state';
import { WidgetType, type EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

import { createEditorView } from '../createEditorView';
import { setImageUiState, type ImageUiState } from '../image/imageUiState';
import { EXPAND_ICON, MORE_ICON } from '../mediaPresentation/embedControlIcons';
import { EDIT_ICON } from '../mediaPresentation/invalidEmbedCard';
import type { PageEmbedResolution } from '../../../render/blocks/pageEmbedResolution';

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
 * `MarkdownEditor.css`'s existing `.cm-content[contenteditable='false']`
 * rule (already hiding `.cm-media-controls`/`.cm-pdf-control--mutating`/
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
    readonly resolution: Extract<PageEmbedResolution, { status: 'resolved' }>,
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
    return (
      this.resolution.pageId === other.resolution.pageId &&
      this.resolution.title === other.resolution.title &&
      this.resolution.markdown === other.resolution.markdown &&
      this.pos === other.pos &&
      this.to === other.to &&
      this.ui.revealed === other.ui.revealed
    );
  }

  override toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    // `cm-media-block` — see `ImageWidget.ts`'s own `toDOM` doc comment
    // and `MarkdownEditor.css`'s own doc comment for the shared global
    // media/embed block-flow contract this class enforces.
    container.classList.add('cm-note-embed', 'cm-media-block');
    container.contentEditable = 'false';

    const header = document.createElement('div');
    header.classList.add('cm-note-embed__header');

    const titleSpan = document.createElement('span');
    titleSpan.classList.add('cm-note-embed__title');
    titleSpan.textContent = this.resolution.title;
    titleSpan.title = this.resolution.title;

    const controls = document.createElement('div');
    controls.classList.add('cm-note-embed__controls');
    controls.contentEditable = 'false';

    const expandButton = this.makeButton(EXPAND_ICON, 'Expand', () => {
      this.getOnOpenPage()?.(this.resolution.pageId);
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
