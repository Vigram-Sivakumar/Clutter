import { WidgetType, type EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';

import { createEditorView } from '../createEditorView';
import type { PageEmbedResolution } from '../../../render/blocks/pageEmbedResolution';

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
 * Editing an embedded note's content is only ever possible by opening its
 * real source note (`onOpenPage`, the header button `toDOM()` builds) —
 * there is no edit-in-place, ever, under any circumstance, per this
 * milestone's own permanent product rule.
 */
export class NoteEmbedWidget extends WidgetType {
  private nestedView: EditorView | null = null;

  constructor(
    readonly resolution: Extract<PageEmbedResolution, { status: 'resolved' }>,
    readonly extensions: readonly Extension[],
    readonly onOpenPage: ((pageId: string) => void) | undefined
  ) {
    super();
  }

  override eq(other: NoteEmbedWidget): boolean {
    // Deliberately not comparing `extensions` (a fresh array reference
    // every decoration rebuild, from `buildEditorExtensions()` — see that
    // factory's own doc comment) or `onOpenPage` (a fresh closure per
    // rebuild too, same freshness pattern every other widget's injected
    // callback already follows). Only the resolved content and the page
    // identity are what a genuine re-render needs to react to.
    return (
      this.resolution.pageId === other.resolution.pageId &&
      this.resolution.title === other.resolution.title &&
      this.resolution.markdown === other.resolution.markdown
    );
  }

  override toDOM(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'cm-note-embed';
    container.contentEditable = 'false';

    const header = document.createElement('div');
    header.className = 'cm-note-embed__header';

    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'cm-note-embed__open';
    openButton.textContent = this.resolution.title;
    openButton.disabled = !this.onOpenPage;
    openButton.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    openButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onOpenPage?.(this.resolution.pageId);
    });
    header.append(openButton);

    const content = document.createElement('div');
    content.className = 'cm-note-embed__content';

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
}
