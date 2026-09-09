/**
 * Cycle/depth protection for recursive note embeds. Threaded as a plain
 * value through `buildEditorExtensions()` (its own `ancestry` option),
 * which passes it to `embedLivePreview()`, which checks it (via
 * `checkNoteEmbedAncestry` below) before ever constructing a
 * `NoteEmbedWidget` for a resolved page-embed target — never React
 * context, since there is no React tree in this rendering path at all:
 * note embeds render as real, nested, permanently read-only
 * `EditorView`s (see `NoteEmbedWidget.ts`'s own doc comment for why),
 * not React components.
 */
export interface NoteEmbedAncestry {
  readonly ancestryPageIds: ReadonlySet<string>;
  readonly depth: number;
}

export const ROOT_ANCESTRY: NoteEmbedAncestry = { ancestryPageIds: new Set(), depth: 0 };

/**
 * Default bound on worst-case recursive-render depth, used only when no
 * caller overrides it. Arbitrary but named, not inferred — a default
 * policy value, not a locked architectural constant.
 */
export const DEFAULT_MAX_EMBED_DEPTH = 8;

export type NoteEmbedAncestryCheck =
  | { readonly ok: true; readonly ancestry: NoteEmbedAncestry }
  | { readonly ok: false; readonly reason: 'cycle' | 'depth-limit' };

/**
 * The one shared cycle/depth check — called by `embedLivePreview.ts`
 * before ever constructing a `NoteEmbedWidget` for a resolved page-embed
 * target, so a direct self-embed (`Note A` containing `![[Note A]]`) is
 * caught on first encounter, and a cycle among embedded notes
 * (`B` embeds `C` embeds `B`) is caught the same way one level deeper.
 * Never duplicated between the top-level and nested call sites — both
 * go through `embedLivePreview()`, since every note embed (top-level or
 * nested inside another note embed's own `EditorView`) renders through
 * the same extension, recursively.
 */
export function checkNoteEmbedAncestry(
  ancestry: NoteEmbedAncestry,
  pageId: string,
  maxDepth: number
): NoteEmbedAncestryCheck {
  if (ancestry.ancestryPageIds.has(pageId)) {
    return { ok: false, reason: 'cycle' };
  }
  if (ancestry.depth >= maxDepth) {
    return { ok: false, reason: 'depth-limit' };
  }
  return {
    ok: true,
    ancestry: {
      ancestryPageIds: new Set([...ancestry.ancestryPageIds, pageId]),
      depth: ancestry.depth + 1,
    },
  };
}
