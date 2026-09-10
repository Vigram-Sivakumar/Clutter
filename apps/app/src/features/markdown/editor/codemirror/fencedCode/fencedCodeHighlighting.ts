import type { Extension } from '@codemirror/state';
import { defaultHighlightStyle, HighlightStyle, syntaxHighlighting } from '@codemirror/language';

import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

/**
 * Syntax highlighting for the nested language trees `fencedCodeLanguages.ts`
 * registers via `codeLanguages` — and *only* those trees. `@lezer/markdown`'s
 * base parser bakes its own highlighting tags (heading1-6, emphasis, strong,
 * strikethrough, monospace, ...) directly into every Markdown document's
 * syntax tree regardless of configuration, so a plain, unscoped
 * `syntaxHighlighting(defaultHighlightStyle)` would recolor Markdown syntax
 * that already has a dedicated Live Preview decoration owner — exactly the
 * duplicate-ownership risk `createEditorView.ts`'s doc comment records
 * `markdownHighlighting()` being retired for.
 *
 * `HighlightStyle`'s own `scope` option (a `Language`) is CM6's native way
 * to avoid that: a highlighter with `scope: someLanguage` only applies to
 * node types belonging to that language's own tree, never to the outer
 * Markdown tree it's nested inside. One scoped `HighlightStyle` per
 * registered language, reusing `defaultHighlightStyle`'s own tag→class
 * specs rather than inventing new colors — see
 * `docs/editor-architecture-decisions.md`'s fenced-code entry.
 */
export function fencedCodeHighlighting(): Extension[] {
  return fencedCodeLanguageDescriptions
    .filter((description) => description.support !== undefined)
    .map((description) =>
      syntaxHighlighting(
        HighlightStyle.define(defaultHighlightStyle.specs, {
          scope: description.support!.language,
        })
      )
    );
}
