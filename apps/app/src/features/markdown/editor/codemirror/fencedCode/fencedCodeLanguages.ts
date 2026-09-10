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
 *
 * **`name` is the canonical, properly-cased *display* form** (`JavaScript`,
 * not `javascript`) — deliberately, not incidentally: `fencedCode/
 * fencedCodeLanguageLabel.ts` reads `LanguageDescription.name` directly as
 * the friendly label a fenced block shows at rest, per the explicit
 * instruction not to maintain a second alias/display-name table alongside
 * this one. This is safe for `codeLanguages` matching precisely because
 * `LanguageDescription.of`'s own constructor lowercases `name` when
 * building its internal alias list (confirmed against the installed
 * `@codemirror/language` source: `alias: (spec.alias || []).concat(spec.name).map(s => s.toLowerCase())`)
 * — so `name: 'JavaScript'` still matches a typed `js`/`javascript` info
 * string exactly as `name: 'javascript'` did before; only the *value*
 * returned by a successful match changes, from the lowercase id to the
 * proper display casing.
 *
 * **JSX and TSX intentionally have no distinct entry of their own** — `jsx`
 * is registered as an *alias* of the `JavaScript` entry (parsed with
 * `javascript({ jsx: true })`), `tsx` as an alias of `TypeScript`
 * (`javascript({ jsx: true, typescript: true })`). This registry's own
 * structure is therefore the answer to "what's the canonical label for
 * JSX/TSX": `` ```jsx `` displays as **JavaScript**, `` ```tsx `` as
 * **TypeScript** — not a separate "JSX"/"TSX" label — because there is no
 * separate `LanguageDescription` for either to name one. Introducing
 * distinct `JSX`/`TSX` entries later would be a legitimate registry change
 * (a real product decision, not a display-layer fix), not something
 * `fencedCodeLanguageLabel.ts` should special-case around this registry's
 * current shape.
 */
export const fencedCodeLanguageDescriptions: LanguageDescription[] = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['js', 'jsx', 'mjs', 'cjs'],
    support: javascript({ jsx: true }),
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    alias: ['ts', 'tsx'],
    support: javascript({ jsx: true, typescript: true }),
  }),
  LanguageDescription.of({
    name: 'JSON',
    support: json(),
  }),
  LanguageDescription.of({
    name: 'CSS',
    support: css(),
  }),
  LanguageDescription.of({
    name: 'HTML',
    alias: ['htm'],
    support: html(),
  }),
  LanguageDescription.of({
    name: 'Python',
    alias: ['py'],
    support: python(),
  }),
];
