import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { LanguageDescription, LanguageSupport, StreamLanguage } from '@codemirror/language';
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
 * **Mixed eager/lazy on purpose, not a blanket policy.** The original six
 * languages (JavaScript/JSX/TypeScript/TSX/JSON/CSS/HTML/Python) stay
 * eager (`support`) — they were already working, commonly used, and
 * migrating them now would be an unrelated, unnecessary churn. The first
 * real expansion batch below (YAML, XML, SQL, Shell, C, C++, Java, Go,
 * Rust) uses lazy `load()` instead: unlike the original set, most
 * documents won't use most of these, and several of their grammars are
 * genuinely heavy — eagerly importing all of them for every editor mount
 * has a real, not hypothetical, bundle/init cost. `fencedCode/
 * fencedCodeHighlighting.ts`'s own `Compartment`-based loader is what
 * reconciles this with scoped highlighting's need for a concrete
 * `Language` object — see that file's doc comment for the mechanism.
 * Parsing itself needs nothing extra: `@codemirror/lang-markdown`'s own
 * `getCodeParser` already calls `LanguageDescription.load()` and handles
 * the unloaded case via `ParseContext.getSkippingParser` natively
 * (confirmed against its installed source) — mixing eager and lazy
 * entries in one `codeLanguages` array is exactly what this mechanism is
 * designed for, not a special case this registry has to account for.
 *
 * **Deliberately not `@codemirror/language-data` as a dependency**, for
 * the new batch either, despite it covering every one of these languages
 * (verified directly against its source before choosing each package
 * below — the C-family SQL/XML/YAML aliases and even some highlighting
 * details would be free from it). This registry already diverges from
 * that catalog's own shape once (JSX/TSX, see below) and needs to keep
 * deciding its own exact alias/parse-option semantics — depending on a
 * ~180-entry package just to filter down to 9 adds an indirection with no
 * real benefit over hand-authoring against the same underlying
 * `@codemirror/lang-*`/`@codemirror/legacy-modes` packages it itself
 * uses, which is what every entry below does.
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
  // First expansion batch — lazy (`load`), see this file's own doc
  // comment above for why. Package/alias choices verified directly
  // against `@codemirror/language-data`'s own source before being
  // hand-authored here (not imported from it — see above).
  LanguageDescription.of({
    name: 'YAML',
    alias: ['yml'],
    load: () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  }),
  LanguageDescription.of({
    name: 'XML',
    alias: ['rss', 'wsdl', 'xsd'],
    load: () => import('@codemirror/lang-xml').then((m) => m.xml()),
  }),
  LanguageDescription.of({
    name: 'SQL',
    load: () =>
      import('@codemirror/lang-sql').then((m) => m.sql({ dialect: m.StandardSQL })),
  }),
  LanguageDescription.of({
    name: 'Shell',
    alias: ['bash', 'sh', 'zsh'],
    // No official `@codemirror/lang-shell` package exists — `language-data`
    // itself resolves plain "Shell" to this exact `legacy-modes` stream
    // parser, confirmed against its source. `StreamLanguage.define(...)`
    // produces a genuine `Language` whose tokens carry real
    // `@lezer/highlight` tags (confirmed in this codebase's own prior
    // investigation, see `docs/editor-architecture-decisions.md`), so it
    // composes with `fencedCodeHighlighting.ts`'s `scope` mechanism
    // identically to every Lezer-based entry above — no special-casing
    // needed anywhere else in this file or its consumers.
    load: () =>
      import('@codemirror/legacy-modes/mode/shell').then(
        (m) => new LanguageSupport(StreamLanguage.define(m.shell))
      ),
  }),
  LanguageDescription.of({
    name: 'C',
    load: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  }),
  LanguageDescription.of({
    name: 'C++',
    alias: ['cpp'],
    load: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  }),
  LanguageDescription.of({
    name: 'Java',
    load: () => import('@codemirror/lang-java').then((m) => m.java()),
  }),
  LanguageDescription.of({
    name: 'Go',
    load: () => import('@codemirror/lang-go').then((m) => m.go()),
  }),
  LanguageDescription.of({
    name: 'Rust',
    load: () => import('@codemirror/lang-rust').then((m) => m.rust()),
  }),
];
