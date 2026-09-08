import { createContext, useContext } from 'react';

/**
 * Recursive-rendering metadata for note-embed cycle/depth protection —
 * deliberately narrow: only `currentPageId`-adjacent ancestry bookkeeping,
 * never resolvers, markdown, or session state (those stay as
 * `MarkdownReadRenderer`/`NoteEmbed` props). Provided only by `NoteEmbed`
 * when it recurses into an embedded page's own `MarkdownReadRenderer` call
 * — a top-level render (Read Mode, or any render with no ancestor embed)
 * never touches this context at all and gets `ROOT_ANCESTRY` by default,
 * so `MarkdownReadRenderer`'s own prop contract stays exactly
 * `markdown + resolvers` for every caller.
 *
 * Note: the top-level caller (not yet built — a future Read Mode/embed
 * entry point) is responsible for seeding `ancestryPageIds` with the page
 * *currently being rendered*'s own id before the first `NoteEmbed` is
 * reached, so a direct self-embed (`Note A` containing `![[Note A]]`) is
 * caught. Without that seeding, only a cycle entirely *among* embedded
 * notes (`B` embeds `C` embeds `B`) is caught by `NoteEmbed` alone — this
 * is a known, deliberate scope boundary of this milestone, not a gap in
 * the cycle-detection logic itself.
 */
export interface NoteEmbedAncestry {
  readonly ancestryPageIds: ReadonlySet<string>;
  readonly depth: number;
}

export const ROOT_ANCESTRY: NoteEmbedAncestry = { ancestryPageIds: new Set(), depth: 0 };

export const NoteEmbedAncestryContext = createContext<NoteEmbedAncestry | null>(null);

export function useNoteEmbedAncestry(): NoteEmbedAncestry {
  return useContext(NoteEmbedAncestryContext) ?? ROOT_ANCESTRY;
}
