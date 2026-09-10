import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { LanguageDescription } from '@codemirror/language';
import { python } from '@codemirror/lang-python';

/**
 * The `codeLanguages` list handed to `@codemirror/lang-markdown`'s own
 * `markdown({ codeLanguages })` option (`markdownLanguage.ts`) — this is
 * CM6's native mechanism for resolving a fenced code block's info string
 * (` ```js `) to a nested language parser via `@lezer/markdown`'s
 * `parseCode`/`parseMixed`; see `docs/editor-architecture-decisions.md`'s
 * fenced-code entry for the investigation that ruled out any custom
 * parsing/highlighting layer here.
 *
 * A deliberately small, fixed, curated set — not a dynamic plugin registry
 * — so each `LanguageSupport` is constructed eagerly via `support` rather
 * than `LanguageDescription`'s lazy `load()` option. Laziness would only
 * help bundle size, and would also defer the concrete `Language` object
 * `fencedCodeHighlighting.ts` needs (synchronously, at editor-setup time)
 * to scope highlighting to each nested language without recoloring
 * Markdown's own tags. For this fixed five-language set, that tradeoff
 * isn't worth the added load-then-reconfigure machinery; revisit if this
 * list grows into something that should be user-configurable or paginated.
 */
export const fencedCodeLanguageDescriptions: LanguageDescription[] = [
  LanguageDescription.of({
    name: 'javascript',
    alias: ['js', 'jsx', 'mjs', 'cjs'],
    support: javascript({ jsx: true }),
  }),
  LanguageDescription.of({
    name: 'typescript',
    alias: ['ts', 'tsx'],
    support: javascript({ jsx: true, typescript: true }),
  }),
  LanguageDescription.of({
    name: 'json',
    support: json(),
  }),
  LanguageDescription.of({
    name: 'css',
    support: css(),
  }),
  LanguageDescription.of({
    name: 'html',
    alias: ['htm'],
    support: html(),
  }),
  LanguageDescription.of({
    name: 'python',
    alias: ['py'],
    support: python(),
  }),
];
