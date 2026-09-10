import type { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

/**
 * The color-bearing tag groups from `@codemirror/language`'s own
 * `defaultHighlightStyle` (what this file used before this change),
 * re-pointed at `design-system/syntax-tokens.css`'s `--syntax-*` custom
 * properties instead of that style's hardcoded, non-theme-aware hex values
 * (`defaultHighlightStyle` is a single fixed light-oriented palette — it
 * never adapted to the app's dark/light theme). Each spec's `color` is a
 * plain `var(...)` string; `HighlightStyle` writes it into the generated
 * `.cmt-*` stylesheet verbatim, so the browser's own CSS cascade — not this
 * extension — resolves the right color per `[data-theme]`, live, with no
 * rebuild on theme change.
 *
 * Deliberately drops `defaultHighlightStyle`'s `tags.meta` color and its
 * decoration-only specs (`link`/`heading`/`emphasis`/`strong`/
 * `strikethrough` — text-decoration/font-style, no color): those are
 * Markdown-tree concerns that don't fire inside a nested JS/Python parse
 * tree in practice, and this file is scoped to *code* syntax only — see
 * `syntax-tokens.css`'s own doc comment for the full category rationale.
 * Groups tags exactly the way `defaultHighlightStyle` already did except
 * where VS Code's real Dark+/Light+ themes don't actually distinguish two
 * of its groups by color (`atom`/`bool`/`url`/`contentSeparator`/
 * `labelName` share `--syntax-keyword`'s value in both real VS Code
 * themes, not a separate "constant" color) — consolidated rather than
 * carrying that distinction into a token with no real color difference.
 */
export const fencedCodeHighlightSpecs = [
  { tag: tags.comment, color: 'var(--syntax-comment)' },
  {
    tag: [
      tags.keyword,
      tags.atom,
      tags.bool,
      tags.url,
      tags.contentSeparator,
      tags.labelName,
      // `tagName` (CSS/HTML element selectors and tag names) would
      // otherwise fall back to `typeName`'s rule below (its only ancestor
      // in @lezer/highlight's own tag hierarchy is `typeName`, not
      // `keyword`) — real VS Code colors element/tag names the same blue
      // as keywords (`entity.name.tag`), not the teal used for actual
      // type names, so this is an explicit override, not redundant with
      // the typeName rule.
      tags.tagName,
    ],
    color: 'var(--syntax-keyword)',
  },
  { tag: [tags.string, tags.deleted], color: 'var(--syntax-string)' },
  {
    tag: [tags.regexp, tags.escape, tags.special(tags.string)],
    color: 'var(--syntax-regexp)',
  },
  {
    // Hex/named color literals (CSS `#ff0000`) are `literal`'s child in
    // @lezer/highlight, same as `number`, so without this explicit
    // override they'd silently fall back to the number color below. Its
    // own token, not reused from string/number: confirmed directly
    // against `support.constant.color`/`constant.other.color.rgb-value`
    // in VS Code's actual dark_plus.json/light_plus.json — Dark+'s value
    // (`#CE9178`) happens to equal its string color, but Light+'s
    // (`#0451A5`) is a genuinely distinct blue, not `#A31515` string-red,
    // so this can't be folded into `--syntax-string` without being wrong
    // in light mode.
    tag: tags.color,
    color: 'var(--syntax-color)',
  },
  {
    tag: [
      tags.literal,
      tags.inserted,
      // `unit` (CSS `12px`'s `px`) is defined as a *subtag of `keyword`*
      // in @lezer/highlight itself (`unit: t(keyword)`), not of `literal`
      // — without this explicit override it would silently inherit the
      // keyword rule above and render blue. Real VS Code colors units the
      // same green as numbers (`keyword.other.unit`, `#B5CEA8`/`#098658`).
      tags.unit,
    ],
    color: 'var(--syntax-number)',
  },
  {
    tag: [
      tags.definition(tags.variableName),
      tags.local(tags.variableName),
      tags.definition(tags.propertyName),
      // Plain (non-definition) `propertyName` — CSS property names
      // (`color:`, `background:`), JSON object keys, HTML attribute names
      // (`attributeName` is itself a subtag of `propertyName`, so it
      // falls back to this rule too). Its only ancestor in
      // @lezer/highlight is the uncolored base `name` tag, so without
      // this these rendered with no color at all — the exact gap that
      // prompted this pass. Matches real VS Code's
      // `support.type.property-name`/`entity.other.attribute-name`
      // (`#9CDCFE`/`#001080`, the same color already used for variables).
      tags.propertyName,
    ],
    color: 'var(--syntax-variable)',
  },
  {
    tag: [tags.typeName, tags.namespace, tags.className],
    color: 'var(--syntax-type)',
  },
  {
    tag: [
      tags.special(tags.variableName),
      tags.macroName,
      // `@lezer/javascript`'s own grammar (`src/highlight.js`) tags a
      // function's *own declared name* as the composed tag
      // `function(definition(variableName))`, and a function *call site*
      // as `function(variableName)` — distinct composed tags, not
      // sub/supertags of the plain `definition(variableName)` this file's
      // variable rule above matches. Without these two explicit entries,
      // both `greet` in `function greet() {}` and any call to `greet()`
      // resolved through the variable rule instead (confirmed: rendered
      // as `--syntax-variable` blue, not `--syntax-function` cream, in a
      // live check). Matches real VS Code's `entity.name.function`
      // (`#DCDCAA`/`#795E26`) for both declaration and call.
      tags.function(tags.variableName),
      tags.function(tags.definition(tags.variableName)),
      // Method calls (`console.log(...)`, `array.push(...)`) — the same
      // grammar file tags `CallExpression/MemberExpression/PropertyName`
      // as `function(propertyName)`, a third distinct composed tag
      // (confirmed live: `log` in `console.log(message)` fell through to
      // the plain `propertyName` rule above and rendered variable-blue
      // until this was added).
      tags.function(tags.propertyName),
    ],
    color: 'var(--syntax-function)',
  },
  { tag: tags.invalid, color: 'var(--syntax-invalid)' },
];

/**
 * Syntax highlighting for the nested language trees `fencedCodeLanguages.ts`
 * registers via `codeLanguages` — and *only* those trees. `@lezer/markdown`'s
 * base parser bakes its own highlighting tags (heading1-6, emphasis, strong,
 * strikethrough, monospace, ...) directly into every Markdown document's
 * syntax tree regardless of configuration, so a plain, unscoped
 * `syntaxHighlighting(...)` over the whole document would recolor Markdown
 * syntax that already has a dedicated Live Preview decoration owner —
 * exactly the duplicate-ownership risk `createEditorView.ts`'s doc comment
 * records `markdownHighlighting()` being retired for.
 *
 * `HighlightStyle`'s own `scope` option (a `Language`) is CM6's native way
 * to avoid that: a highlighter with `scope: someLanguage` only applies to
 * node types belonging to that language's own tree, never to the outer
 * Markdown tree it's nested inside. One scoped `HighlightStyle` per
 * registered language, built from `fencedCodeHighlightSpecs` above — see
 * `docs/editor-architecture-decisions.md`'s fenced-code entry.
 */
export function fencedCodeHighlighting(): Extension[] {
  return fencedCodeLanguageDescriptions
    .filter((description) => description.support !== undefined)
    .map((description) =>
      syntaxHighlighting(
        HighlightStyle.define(fencedCodeHighlightSpecs, {
          scope: description.support!.language,
        })
      )
    );
}
