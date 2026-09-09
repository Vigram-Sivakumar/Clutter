import { syntaxTree } from '@codemirror/language';
import { Prec, type Extension, type Range } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type PluginValue,
  type ViewUpdate,
} from '@codemirror/view';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode, SyntaxNodeRef } from '@lezer/common';

import { isTokenEngaged, type TokenNodeRange } from '../semanticToken/tokenEngagement';
import { renderWikiLink } from './wikiLinkDecorations';
import { lastUnescapedSlashOffset, scanWikiLink, splitAtFirstUnescapedPipe } from './wikiLinkScanner';
import type { ResolveWikiLink } from './wikiLinkResolution';

/**
 * Widens WikiLink's own engagement boundary to include any directly
 * enclosing chain of delimited-inline-formatting ancestors (Emphasis,
 * StrongEmphasis, Strikethrough, Highlight, InlineCode — every construct
 * `delimitedInlineRenderer` in `inlineLivePreviewParticipants.ts` handles),
 * without naming any of them: every one of those, and only those, parses
 * with exactly two identically-named children whose name ends in `Mark`
 * bracketing the content (already asserted generically by
 * `inlineLivePreviewRegion.test.ts`'s "node shape" test) — the same
 * structural fact `delimitedInlineRenderer` itself keys off (`firstChild`/
 * `lastChild` same-name check). Reusing that fact here, rather than a list
 * of node names, is what keeps this generic: it composes with any current
 * or future participant following the same grammar convention with zero
 * new knowledge added about what that participant is.
 *
 * Stops at the first ancestor that doesn't match — ordinary block
 * containers (Paragraph, Document, ListItem, TableCell, ...) never have
 * two identically-`Mark`-named children bracketing their content, so the
 * walk naturally terminates at the paragraph boundary rather than
 * reaching the document root.
 *
 * Without this, `**[[Page]]**` has a real two-character gap on each side
 * (the `**` runs) where StrongEmphasis's own, separately-computed
 * engagement is true but WikiLink's own (narrower) node range isn't yet —
 * producing a `**Page**` state that shouldn't exist. This makes WikiLink's
 * engagement track the *outermost* enclosing region that visually reveals
 * around it, exactly like nested delimited constructs already track each
 * other via `inlineLivePreviewRegion.ts`'s own short-circuit — just
 * computed bottom-up here, since WikiLink sits outside that traversal.
 */
function isDelimitedMarkConstruct(node: SyntaxNode): boolean {
  const first = node.firstChild;
  const last = node.lastChild;
  return !!first && !!last && first !== last && first.name === last.name && first.name.endsWith('Mark');
}

function widenToEnclosingLivePreviewRegion(node: SyntaxNodeRef): TokenNodeRange {
  let widest: TokenNodeRange = { from: node.from, to: node.to };
  let ancestor = node.node.parent;
  while (ancestor && isDelimitedMarkConstruct(ancestor)) {
    widest = { from: ancestor.from, to: ancestor.to };
    ancestor = ancestor.parent;
  }
  return widest;
}

/**
 * WikiLink's own, standalone visibility mechanism — deliberately outside
 * `inlineLivePreviewRegion.ts`. WikiLink no longer implements that shared
 * mechanism's contract ("engaged region reveals raw source"): the required
 * behavior here is that the folder-qualified path must never be visible,
 * in either state, while the rest of the WikiLink syntax (`[[`, filename,
 * `|alias`, `]]`) becomes plain editable text once engaged. That's a
 * genuinely different per-node contract than every other participant in
 * `inlineLivePreviewParticipants.ts` shares — Tag and Date keep the
 * ordinary reveal-on-engage contract unchanged, so they stay there.
 *
 * At rest: identical to the retired participant entry — `renderWikiLink`
 * (unchanged) produces the same at-rest widget, atomic exactly as before.
 *
 * Engaged: `[[`, the filename, `|alias` (if present), and `]]` all render
 * as plain, unstyled, editable text — not atomic, per the explicit
 * requirement that Backspace/Delete work character-by-character rather
 * than risk one keystroke deleting the whole reference. Only the
 * folder-prefix substring (up to and including the last unescaped `/`) is
 * concealed. `lastUnescapedSlashOffset`/`splitAtFirstUnescapedPipe` are
 * reused unchanged from `wikiLinkScanner.ts` — the same primitives
 * `wikiLinkCompletionSource.ts` already uses to scope its own query to
 * "the visible segment", so there is exactly one definition of where the
 * visible part starts, not two.
 *
 * The engaged text is always wrapped in one `Decoration.mark({})` spanning
 * the whole node (`ENGAGED_WIKILINK_MARK`, below) — unstyled, never
 * atomic, purely a stable DOM element boundary. This is not optional
 * decoration: confirmed via live instrumentation (arrow-key-stuck-at-`[[`
 * investigation) that on WebKit/Tauri, when this branch previously
 * returned `[]` for a slash-free path, the just-revealed text landed as a
 * bare Text node directly adjacent to the paragraph's own preceding bare
 * Text node with no element between them — and WebKit's native
 * caret-advance fails to cross that specific bare-text/bare-text seam,
 * permanently losing the native selection onto the line's own container
 * `<div>` (confirmed via `document.getSelection()` vs `EditorState.selection`
 * comparison: the model position kept advancing correctly the entire time;
 * only the browser's rendered caret froze). Every sibling participant in
 * `inlineLivePreviewParticipants.ts` (`delimitedInlineRenderer`,
 * `linkRenderer`, even `urlRenderer` for a URL that never changes on
 * engage) already always wraps its revealed content in a `Decoration.mark`
 * for exactly this reason — WikiLink's slash-free branch was the only
 * participant in the codebase that skipped it. No `class`/`attributes`: a
 * `Decoration.mark` never needs one to produce a real wrapping element —
 * `MarkDecoration` defaults `tagName` to `"span"` regardless.
 *
 * The concealed folder-prefix range computed below (`computeConcealedFolderPrefixRange`,
 * exported) is reused by `wikiLinkConcealedPrefixNavigation.ts` — a
 * narrowly-scoped ArrowLeft/ArrowRight keymap that hops over exactly this
 * concealed run in one keystroke when the caret sits at its edge, so
 * crossing a folder-qualified path doesn't cost one silent, invisible
 * keystroke per hidden character. That keymap is the one place in this
 * codebase that reopens docs/editor-architecture-decisions.md's
 * "CodeMirror owns cursor and selection behavior" entry, per that entry's
 * own reservation clause — see that file's doc comment for the full
 * justification and its strict scope (Arrow keys only, only at this exact
 * concealed range's boundary; Backspace/Delete/typing/click/drag-selection
 * are entirely untouched, still ordinary CM6 defaults over non-atomic
 * decorations, exactly as before).
 *
 * Reuses `isTokenEngaged` unchanged (imported, never modified) — the exact
 * same containment check every other construct uses, just evaluated from
 * this file's own tree scan instead of the shared traversal's.
 */
const ENGAGED_WIKILINK_MARK = Decoration.mark({});

/**
 * The folder-prefix substring (up to and including the last unescaped
 * `/`) that stays concealed even while engaged — the one part of a
 * WikiLink's raw syntax that never becomes visible, per this file's own
 * "folder-qualified path must never be visible, in either state"
 * requirement (above). Extracted from `buildEngagedDecorations` and
 * exported so `wikiLinkConcealedPrefixNavigation.ts` computes hop targets
 * from the exact same range this file decorates — one definition of
 * "where the concealed run is," not two.
 */
export function computeConcealedFolderPrefixRange(
  node: TokenNodeRange,
  state: EditorState
): TokenNodeRange | null {
  if (node.to > state.doc.lineAt(node.from).to) {
    return null;
  }

  const raw = state.sliceDoc(node.from, node.to);
  if (!scanWikiLink(raw, 0)) {
    return null;
  }

  const middleStart = node.from + 2;
  const middleEnd = node.to - 2;
  const middleRaw = state.sliceDoc(middleStart, middleEnd);
  const { pipeIndex } = splitAtFirstUnescapedPipe(middleRaw);
  const pathRawEnd = pipeIndex === null ? middleEnd : middleStart + pipeIndex;
  const pathRaw = state.sliceDoc(middleStart, pathRawEnd);

  const slashOffset = lastUnescapedSlashOffset(pathRaw);
  if (slashOffset === null) {
    return null;
  }

  return { from: middleStart, to: middleStart + slashOffset + 1 };
}

function buildEngagedDecorations(node: SyntaxNodeRef, state: EditorState): Range<Decoration>[] {
  if (node.to > state.doc.lineAt(node.from).to) {
    // The scanner (wikiLinkScanner.ts) never emits a WikiLink node crossing
    // a physical line break, but this guards the CM6 invariant directly —
    // a Decoration.replace() spanning a line break from this ViewPlugin
    // would throw "Decorations that replace line breaks may not be
    // specified via plugins". Leave the text undecorated rather than crash.
    return [];
  }

  const raw = state.sliceDoc(node.from, node.to);
  if (!scanWikiLink(raw, 0)) {
    // Stale tree — next reparse corrects it, same as the at-rest branch.
    return [];
  }

  const decorations: Range<Decoration>[] = [ENGAGED_WIKILINK_MARK.range(node.from, node.to)];

  const concealedPrefix = computeConcealedFolderPrefixRange(node, state);
  if (concealedPrefix) {
    decorations.push(Decoration.replace({}).range(concealedPrefix.from, concealedPrefix.to));
  }

  return decorations;
}

function buildDecorations(
  view: EditorView,
  getResolver: () => ResolveWikiLink | undefined
): { decorations: DecorationSet; atomic: DecorationSet } {
  const ranges: Range<Decoration>[] = [];
  const atomicRanges: Range<Decoration>[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== 'WikiLink') {
          return;
        }

        if (node.to > view.state.doc.lineAt(node.from).to) {
          // See the identical guard in buildEngagedDecorations above — the
          // scanner already prevents this, this is belt-and-suspenders
          // against the CM6 line-break-replace invariant.
          return;
        }

        if (isTokenEngaged(view.state, widenToEnclosingLivePreviewRegion(node))) {
          ranges.push(...buildEngagedDecorations(node, view.state));
          return;
        }

        const raw = view.state.sliceDoc(node.from, node.to);
        const widget = renderWikiLink(raw, getResolver);
        if (!widget) {
          return;
        }
        const range = Decoration.replace({ widget }).range(node.from, node.to);
        ranges.push(range);
        atomicRanges.push(range);
      },
    });
  }

  return { decorations: Decoration.set(ranges, true), atomic: Decoration.set(atomicRanges, true) };
}

interface WikiLinkLivePreviewPlugin extends PluginValue {
  decorations: DecorationSet;
  atomic: DecorationSet;
}

export function wikiLinkLivePreview(getResolver: () => ResolveWikiLink | undefined): Extension {
  const plugin = ViewPlugin.fromClass<WikiLinkLivePreviewPlugin>(
    class implements WikiLinkLivePreviewPlugin {
      decorations: DecorationSet;
      atomic: DecorationSet;

      constructor(view: EditorView) {
        ({ decorations: this.decorations, atomic: this.atomic } = buildDecorations(view, getResolver));
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          ({ decorations: this.decorations, atomic: this.atomic } = buildDecorations(update.view, getResolver));
        }
      }
    },
    { decorations: (p) => p.decorations }
  );

  const atomic = EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic ?? Decoration.none);

  // Prec.high: keeps this extension self-contained rather than relying on
  // where MarkdownEditor.tsx happens to list it. CM6 nests mark/widget
  // decorations by facet precedence, not by range containment alone (see
  // Decoration.mark's own doc comment in @codemirror/view) — the enclosing
  // StrongEmphasis/Strikethrough/etc. content mark (inlineLivePreviewRegion,
  // default precedence) must not out-rank the WikiLink widget, or it gets
  // split at the widget's boundary instead of wrapping it. Verified by a
  // controlled A/B: swapping only registration order changed a bare
  // `<span class="tok-wikilink">` sibling into the correct
  // `tok-strong > tok-wikilink` nesting.
  return Prec.high([plugin, atomic]);
}
