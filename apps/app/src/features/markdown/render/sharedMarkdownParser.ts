import { parser as baseMarkdownParser } from '@lezer/markdown';

import { markdownGrammarExtensions } from '../editor/codemirror/markdownGrammarExtensions';

/**
 * The one configured `@lezer/markdown` parser instance used by every
 * CM6-independent, read-only rendering surface — `tokenizeCompactMarkdown`
 * and the block-aware `MarkdownReadRenderer` both parse with this exact
 * grammar, completely independent of CodeMirror (no `EditorView`/
 * `EditorState` involved), so neither can silently disagree with the page
 * editor about what counts as bold/italic/WikiLink/Tag/Date/Embed/etc.
 * Configured once here rather than each consumer calling `.configure(...)`
 * on its own copy.
 */
export const sharedMarkdownParser = baseMarkdownParser.configure(markdownGrammarExtensions);
