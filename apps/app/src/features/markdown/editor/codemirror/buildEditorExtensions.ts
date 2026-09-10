import type { Extension } from '@codemirror/state';

import { semanticCompletion } from './completion';
import { dateAutocomplete } from './date/dateAutocomplete';
import { dateMouseHandlers } from './date/dateMouseHandlers';
import type { ResolveDate } from './date/dateResolution';
import { markdownEnterKeymap } from './enter/markdownEnterKeymap';
import { markdownIndentKeymap } from './indent/markdownIndentKeymap';
import { orderedListStructuralNormalization } from './list/orderedListStructuralNormalization';
import { formatShortcutsKeymap } from './format/formatShortcutsKeymap';
import { blockquoteLineDecoration } from './highlight/blockquoteLineDecoration';
import { blockquoteMarkerDecoration } from './highlight/blockquoteMarkerDecoration';
import { fencedCodeBlockLineDecoration } from './highlight/fencedCodeBlockLineDecoration';
import { fencedCodeBlockWrapper } from './highlight/fencedCodeBlockWrapper';
import { fencedCodeCopyButtonDecoration } from './highlight/fencedCodeCopyButtonDecoration';
import { fencedCodeLanguageLabelDecoration } from './highlight/fencedCodeLanguageLabelDecoration';
import { fencedCodeMarkerDecoration } from './highlight/fencedCodeMarkerDecoration';
import { headingMarkerDecoration } from './highlight/headingMarkerDecoration';
import { createInlineLivePreviewParticipants } from './highlight/inlineLivePreviewParticipants';
import { inlineLivePreviewRegion } from './highlight/inlineLivePreviewRegion';
import { leadingIndentDecoration } from './highlight/leadingIndentDecoration';
import { linkMouseHandlers } from './link/linkMouseHandlers';
import { urlMouseHandlers } from './link/urlMouseHandlers';
import { listMarkerCaretAssoc, listMarkerDecoration } from './list/listMarkerDecoration';
import { taskCheckboxDecoration } from './task/taskCheckboxDecoration';
import { taskCheckboxMouseHandlers } from './task/taskCheckboxMouseHandlers';
import { taskCompletedContentDecoration } from './task/taskCompletedContentDecoration';
import { taskCompletionMetadataDecoration } from './task/taskCompletionMetadataDecoration';
import { horizontalRuleDecoration } from './hr/horizontalRuleDecoration';
import type { OnImageClick, OnOpenImageMenu } from './image/ImageWidget';
import { imageLivePreview } from './image/imageLivePreview';
import { embedLivePreview } from './embed/embedLivePreview';
import { fencedCodeHighlighting } from './fencedCode/fencedCodeHighlighting';
import type { OnOpenPdfMenu, OnPdfEmbedClick } from './pdf/PdfEmbedWidget';
import type { ResolveImageSrc } from './image/imageSrcResolution';
import { markdownLanguageExtension } from './markdownLanguage';
import type { ResolveTag } from './tag/tagResolution';
import type { GetTagSuggestions } from './tag/tagSuggestion';
import { tagAutocomplete } from './tag/tagAutocomplete';
import { tagMouseHandlers } from './tag/tagMouseHandlers';
import type { ResolveWikiLink } from './wikilink/wikiLinkResolution';
import type { GetWikiLinkSuggestions } from './wikilink/wikiLinkSuggestion';
import { wikiLinkAutocomplete } from './wikilink/wikiLinkAutocomplete';
import { embedAutocomplete } from './embed/embedAutocomplete';
import { wikiLinkLivePreview } from './wikilink/wikiLinkLivePreview';
import { wikiLinkMouseHandlers } from './wikilink/wikiLinkMouseHandlers';
import type { ResolveEmbedImage } from './embed/embedImageResolution';
import type { ResolveEmbedPdf } from './pdf/embedPdfResolution';
import type { ResolvePageEmbed } from '../../render/blocks/pageEmbedResolution';
import type { GetEmbedHeadingSuggestions, GetEmbedSuggestions } from './embed/embedSuggestion';
import { ROOT_ANCESTRY, type NoteEmbedAncestry } from './embed/noteEmbedAncestry';
import type { OnOpenNoteEmbedMenu } from './embed/NoteEmbedWidget';

/**
 * Every getter here follows the same "read fresh per rebuild/per click"
 * freshness pattern the previous inline `MarkdownEditor.tsx` extension
 * list already established (`() => someRef.current`) — this factory
 * doesn't change that contract, it only moves the *construction* of the
 * extension array somewhere both `MarkdownEditor.tsx` (the normal,
 * editable top-level editor) and `NoteEmbedWidget.ts` (a note embed's
 * nested, permanently read-only `EditorView`) can call it identically,
 * so both render through the exact same headings/emphasis/image/PDF/
 * checkbox/embed decorations — the actual product requirement behind
 * this extraction (docs/implementation-rules.md's "reuse, don't
 * duplicate" rule). Only `readOnly: true` differs anything below, and
 * only where a mutating capability (editing keymaps, autocomplete,
 * ordered-list renumbering, the task-checkbox toggle handler) has no
 * meaning in a view that can never be edited — every purely-rendering or
 * purely-navigational (click-to-open, non-mutating) extension is
 * included unconditionally, for both callers.
 */
export interface BuildEditorExtensionsOptions {
  readonly resolveWikiLink: () => ResolveWikiLink | undefined;
  readonly getWikiLinkSuggestions?: () => GetWikiLinkSuggestions | undefined;
  readonly getEmbedSuggestions?: () => GetEmbedSuggestions | undefined;
  readonly getEmbedHeadingSuggestions?: () => GetEmbedHeadingSuggestions | undefined;
  readonly resolveEmbedImage: () => ResolveEmbedImage | undefined;
  readonly resolveEmbedPdf: () => ResolveEmbedPdf | undefined;
  /**
   * Resolves an `Embed`'s target into a note (vs. image/PDF) — consulted
   * by `embedLivePreview()` only after both resolvers above decline (see
   * that file's own doc comment for exactly where). Omitted entirely (as
   * every pre-note-embed call site already did) simply means `![[Page]]`
   * never resolves to a note embed, falling through to the same
   * already-existing "missing resource" rendering `![[missing.png]]` gets
   * today — never a crash, never a second error path to maintain.
   */
  readonly resolvePageEmbed?: () => ResolvePageEmbed | undefined;
  readonly onImageClick: () => OnImageClick | undefined;
  readonly onOpenImageMenu: () => OnOpenImageMenu | undefined;
  readonly onPdfEmbedClick: () => OnPdfEmbedClick | undefined;
  readonly onOpenPdfMenu: () => OnOpenPdfMenu | undefined;
  /**
   * A note embed's own Expand action (`NoteEmbedWidget.ts`'s header
   * button) — opens the real source note via the existing page-navigation
   * mechanism, the only supported way to edit an embedded note's content,
   * per this milestone's own permanent product rule. Unused when
   * `resolvePageEmbed` is omitted.
   */
  readonly onOpenPage?: () => ((pageId: string) => void) | undefined;
  /** A note embed's own "More actions" trigger (Turn into WikiLink/Remove) — see `NoteEmbedMoreActions.tsx`'s doc comment. Unused when `resolvePageEmbed` is omitted. */
  readonly onOpenNoteEmbedMenu?: () => OnOpenNoteEmbedMenu | undefined;
  readonly resolveImageSrc: () => ResolveImageSrc | undefined;
  readonly resolveTag: () => ResolveTag | undefined;
  readonly getTagSuggestions?: () => GetTagSuggestions | undefined;
  readonly resolveDate: () => ResolveDate | undefined;
  /**
   * Fires after a task checkbox toggle actually dispatches — unused (and
   * never wired to a mouse handler at all) when `readOnly` is `true`,
   * since a note embed's checkbox can never be toggled in the first
   * place. The top-level editor passes its own `onFlush` here, matching
   * the pre-extraction inline call.
   */
  readonly onTaskCheckboxToggled?: () => void;
  /**
   * `false` for the normal, top-level `MarkdownEditor` (the only caller
   * that ever passes `false` — its own `createEditorView({ readOnly })`
   * call must agree; this factory has no way to enforce that itself).
   * `true` for a note embed's nested view — excludes every editing-only
   * extension (keymaps, autocomplete, ordered-list renumbering, the
   * task-checkbox toggle handler) that has no meaning once
   * `blockReadOnlyEdits`/`EditorView.editable.of(false)`
   * (`createEditorView.ts`) already make document mutation impossible;
   * everything else — every rendering decoration and every non-mutating
   * click handler (WikiLink/Tag/Date/Link/image/PDF-Expand navigation) —
   * is included either way, which is exactly the visual-parity property
   * a note embed needs.
   */
  readonly readOnly: boolean;
  /**
   * Cycle/depth-protection state for recursive note embeds
   * (`noteEmbedAncestry.ts`) — defaults to `ROOT_ANCESTRY` for the
   * top-level editor. A note embed's own nested extensions (built inside
   * `NoteEmbedWidget.ts`) pass the already-extended ancestry
   * `checkNoteEmbedAncestry` returned when this embed itself was
   * constructed, so a cycle or depth-limit anywhere in the chain is
   * caught the same way, one level at a time, regardless of how deep the
   * recursion already is.
   */
  readonly ancestry?: NoteEmbedAncestry;
  readonly maxEmbedDepth?: number;
}

export function buildEditorExtensions(options: BuildEditorExtensionsOptions): Extension[] {
  const {
    resolveWikiLink,
    getWikiLinkSuggestions,
    getEmbedSuggestions,
    getEmbedHeadingSuggestions,
    resolveEmbedImage,
    resolveEmbedPdf,
    resolvePageEmbed,
    onImageClick,
    onOpenImageMenu,
    onPdfEmbedClick,
    onOpenPdfMenu,
    onOpenPage,
    onOpenNoteEmbedMenu,
    resolveImageSrc,
    resolveTag,
    getTagSuggestions,
    resolveDate,
    onTaskCheckboxToggled,
    readOnly,
    ancestry = ROOT_ANCESTRY,
    maxEmbedDepth,
  } = options;

  const rendering: Extension[] = [
    markdownLanguageExtension(),
    ...fencedCodeHighlighting(),
    inlineLivePreviewRegion(
      createInlineLivePreviewParticipants({
        resolveTag,
        resolveDate,
      })
    ),
    wikiLinkLivePreview(resolveWikiLink),
    imageLivePreview(onImageClick, onOpenImageMenu, resolveImageSrc),
    embedLivePreview({
      resolveEmbedImage,
      onImageClick,
      onOpenImageMenu,
      resolveEmbedPdf,
      onPdfEmbedClick,
      onOpenPdfMenu,
      resolvePageEmbed,
      onOpenPage,
      onOpenNoteEmbedMenu,
      resolveWikiLink,
      resolveTag,
      resolveDate,
      resolveImageSrc,
      ancestry,
      maxEmbedDepth,
    }),
    listMarkerDecoration(),
    listMarkerCaretAssoc(),
    taskCheckboxDecoration(),
    taskCompletedContentDecoration(),
    taskCompletionMetadataDecoration(),
    blockquoteMarkerDecoration(),
    blockquoteLineDecoration(),
    headingMarkerDecoration(),
    fencedCodeBlockWrapper(),
    fencedCodeBlockLineDecoration(),
    fencedCodeMarkerDecoration(),
    fencedCodeLanguageLabelDecoration(),
    fencedCodeCopyButtonDecoration(),
    horizontalRuleDecoration(),
    leadingIndentDecoration(),
    wikiLinkMouseHandlers(resolveWikiLink),
    tagMouseHandlers(resolveTag),
    dateMouseHandlers(resolveDate),
    linkMouseHandlers(),
    urlMouseHandlers(),
  ];

  if (readOnly) {
    // No document-changing command has any meaning once
    // `createEditorView({ readOnly: true })`'s own `blockReadOnlyEdits`
    // already blocks every doc-changing transaction — omitted here so a
    // note embed's nested view carries no dead keymap/completion/
    // normalization machinery, per this milestone's own "keep the
    // reusable mechanism minimal" instruction, not because any of it
    // would behave incorrectly if left in.
    return rendering;
  }

  return [
    markdownEnterKeymap(),
    markdownIndentKeymap(),
    orderedListStructuralNormalization(),
    ...rendering,
    formatShortcutsKeymap(),
    taskCheckboxMouseHandlers(() => onTaskCheckboxToggled?.()),
    wikiLinkAutocomplete(),
    embedAutocomplete(),
    tagAutocomplete(),
    dateAutocomplete(),
    semanticCompletion(
      getWikiLinkSuggestions ?? (() => undefined),
      getTagSuggestions ?? (() => undefined),
      getEmbedSuggestions ?? (() => undefined),
      getEmbedHeadingSuggestions ?? (() => undefined)
    ),
  ];
}
