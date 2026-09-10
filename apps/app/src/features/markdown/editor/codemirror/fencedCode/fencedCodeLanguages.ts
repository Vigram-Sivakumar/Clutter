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
 * **JSX and TSX are first-class entries, not aliases of JavaScript/TypeScript
 * — a deliberate reversal of this registry's earlier design, made once a
 * larger language catalog made "these display as JavaScript/TypeScript"
 * a real, user-visible cost** (no way to select "JSX" from Change
 * Language; a manually-typed `` ```jsx `` displayed and re-saved as
 * `javascript`, silently discarding what the user wrote). `jsx`/`tsx` were
 * removed from `JavaScript`/`TypeScript`'s own alias lists — each alias
 * string has exactly one owning entry, never two, so
 * `LanguageDescription.matchLanguageName` can't ambiguously match either.
 *
 * **Deliberately not copying `@codemirror/language-data`'s JSX/TSX
 * shape.** That catalog's plain `JavaScript` entry has no `jsx: true` —
 * only its separate `JSX` entry does — which would regress Clutter's
 * existing, more permissive behavior (a bare `` ```js `` block containing
 * embedded JSX parses correctly today, and must keep doing so). So here,
 * `JavaScript`'s and `TypeScript`'s own `support` are unchanged
 * (`jsx: true` stays on both); `JSX`/`TSX` are separate entries with their
 * *own* identity but the exact same `support` construction — the only
 * thing that changes is what a fence labeled `jsx`/`tsx` is called and
 * whether it can be explicitly selected, never how it parses or
 * highlights.
 */
export const fencedCodeLanguageDescriptions: LanguageDescription[] = [
  LanguageDescription.of({
    name: 'JavaScript',
    alias: ['js', 'mjs', 'cjs'],
    support: javascript({ jsx: true }),
  }),
  LanguageDescription.of({
    name: 'JSX',
    support: javascript({ jsx: true }),
  }),
  LanguageDescription.of({
    name: 'TypeScript',
    alias: ['ts'],
    support: javascript({ jsx: true, typescript: true }),
  }),
  LanguageDescription.of({
    name: 'TSX',
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
