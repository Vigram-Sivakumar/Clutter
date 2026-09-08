import { useMemo, type ReactNode } from 'react';

import { renderBlockChildren } from './blocks/renderBlocks';
import type { MarkdownReadResolvers } from './blocks/renderInlineSpans';
import { sharedMarkdownParser } from './sharedMarkdownParser';

import './MarkdownReadRenderer.css';

export type { MarkdownReadResolvers } from './blocks/renderInlineSpans';

export interface MarkdownReadRendererProps {
  readonly markdown: string;
  readonly resolvers?: MarkdownReadResolvers;
}

/**
 * Block-aware, read-only Markdown presentation — the `features/markdown/`
 * counterpart to `MarkdownEditor` (editing) and `renderCompactMarkdown`
 * (single-line/inline sidebar rendering). Parses with the exact same
 * shared grammar (`sharedMarkdownParser`) as both of those, so it can
 * never disagree with the editor about what a page's Markdown means.
 *
 * Contract, per the architecture review this component was designed
 * against: `markdown: string` + injected resolvers only — no `Page`, no
 * `Vault` access, no CodeMirror dependency. The caller (a future Read
 * Mode call site, or a note-embed component) decides which markdown
 * string is current (committed vs. effective/live) and passes it in as
 * a plain string.
 *
 * First-milestone scope: paragraphs, headings, blockquotes, fenced code,
 * horizontal rules, and the full inline set (bold/italic/strikethrough/
 * code/highlight/WikiLink/Tag/Date/link/image-as-text). Lists, tables,
 * and note/image/PDF embeds are deliberately out of scope for this
 * milestone — an unrecognized block renders its raw text rather than
 * disappearing (see `renderUnsupportedBlock` in `renderBlocks.tsx`).
 */
export function MarkdownReadRenderer({ markdown, resolvers = {} }: MarkdownReadRendererProps): ReactNode {
  const tree = useMemo(() => sharedMarkdownParser.parse(markdown), [markdown]);

  return (
    <div className="markdown-read">{renderBlockChildren(tree.topNode, markdown, resolvers, 'block')}</div>
  );
}
