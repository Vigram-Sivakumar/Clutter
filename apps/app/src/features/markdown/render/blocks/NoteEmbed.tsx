import { MarkdownReadRenderer } from '../MarkdownReadRenderer';
import { BrokenEmbed } from './BrokenEmbed';
import { NoteEmbedAncestryContext, useNoteEmbedAncestry } from './NoteEmbedAncestryContext';
import type { PageEmbedResolution } from './pageEmbedResolution';
import type { MarkdownReadResolvers } from './renderInlineSpans';

/**
 * Default bound on worst-case recursive-render cost/depth, used only when
 * a caller doesn't supply `resolvers.maxEmbedDepth`. Arbitrary but named,
 * not inferred — a default policy value, not a locked architectural
 * constant, so any consumer can override it per-render rather than this
 * being hardcoded platform-wide.
 */
export const DEFAULT_MAX_EMBED_DEPTH = 8;

export interface NoteEmbedProps {
  readonly resolution: Extract<PageEmbedResolution, { status: 'resolved' }>;
  readonly resolvers: MarkdownReadResolvers;
}

/**
 * Renders a resolved note embed's content by recursing into
 * `MarkdownReadRenderer` — the same renderer, not a parallel
 * implementation, per this feature's own settled contract ("Read Mode =
 * top-level `MarkdownReadRenderer`, note embed = nested
 * `MarkdownReadRenderer`"). Cycle/depth protection is this component's own
 * concern exclusively — `MarkdownReadRenderer` itself stays unaware of
 * ancestry, and images/PDFs never touch this context at all.
 */
export function NoteEmbed({ resolution, resolvers }: NoteEmbedProps) {
  const ancestry = useNoteEmbedAncestry();
  const maxDepth = resolvers.maxEmbedDepth ?? DEFAULT_MAX_EMBED_DEPTH;

  if (ancestry.ancestryPageIds.has(resolution.pageId)) {
    return <BrokenEmbed label={`Circular embed: ${resolution.title}`} />;
  }

  if (ancestry.depth >= maxDepth) {
    return <BrokenEmbed label={`Embed depth limit reached: ${resolution.title}`} />;
  }

  const nextAncestry = {
    ancestryPageIds: new Set([...ancestry.ancestryPageIds, resolution.pageId]),
    depth: ancestry.depth + 1,
  };

  return (
    <div className="markdown-read-note-embed" data-page-id={resolution.pageId}>
      <NoteEmbedAncestryContext.Provider value={nextAncestry}>
        <MarkdownReadRenderer markdown={resolution.markdown} resolvers={resolvers} />
      </NoteEmbedAncestryContext.Provider>
    </div>
  );
}
