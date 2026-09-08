import { sharedMarkdownParser } from './sharedMarkdownParser';
import { tokenizeInline, type InlineSpan } from './inlineSpan';

/** @deprecated use `InlineSpan` — kept as an alias so existing imports don't break. */
export type CompactSpan = InlineSpan;

/**
 * Tokenizes `text` into a flat, marker-free sequence of `CompactSpan`s for
 * compact (sidebar-row) display — pure, React- and CodeMirror-independent.
 * A thin wrapper over the shared `tokenizeInline` walker, called with the
 * whole document as its scope.
 */
export function tokenizeCompactMarkdown(text: string): CompactSpan[] {
  const tree = sharedMarkdownParser.parse(text);
  return tokenizeInline(tree.topNode, text);
}
