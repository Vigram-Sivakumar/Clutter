import { Compartment, type Extension } from '@codemirror/state';
import { HighlightStyle, LanguageDescription, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
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
  // Plain, unmodified `variableName` — an ordinary identifier *reference*
  // (reading a variable, a CSS custom-property use/declaration, a SQL
  // column/table name — not a definition and not a call site, both of
  // which are already covered by the composed rule above). Confirmed
  // missing via direct audit: `HighlightStyle.style([tags.variableName])`
  // returned `null` before this rule existed, meaning every plain
  // identifier reference across every registered language rendered with
  // no color at all (inherited/default text color) — not merely a CSS
  // issue, since `variableName` is the shared @lezer/highlight tag
  // JavaScript/TypeScript, CSS, Python, C/C++, Java, Rust, Go, and SQL
  // all use identically for this exact construct (each language's own
  // `highlight.js` was read directly to confirm this, not assumed).
  // `defaultHighlightStyle` has the same gap — this isn't a regression
  // from that baseline, it's a real fix beyond it. Reuses
  // `--syntax-variable` (the same token the composed variant above
  // already uses) rather than a new token, since a plain reference and a
  // definition are the same semantic category, just different moments in
  // a variable's lifecycle.
  { tag: tags.variableName, color: 'var(--syntax-variable)' },
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
      // Shell builtin command names (`echo`, `cd`, `cat`, ...) —
      // `@codemirror/legacy-modes`' own shell mode tags these as the
      // string token type `"builtin"`, which `@codemirror/language`'s
      // fixed legacy-mode token table (confirmed directly against its
      // installed source) maps to `variableName.standard`, i.e.
      // `tags.standard(tags.variableName)`. Left unmapped, this falls
      // back (via the tag hierarchy) to the plain `variableName` rule
      // above — variable-blue. Explicitly overridden to function-color
      // instead: a builtin command name is "a well-known callable being
      // invoked," the same category as every other entry in this group,
      // not "a piece of data being referenced" — matching the standard
      // TextMate/VS Code convention of scoping shell builtins as
      // `support.function.builtin.shell`, which inherits `support.function`'s
      // coloring (the same cream/olive already used for every other
      // function name here), not `variable`'s.
      tags.standard(tags.variableName),
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
function buildFencedCodeHighlighters(): Extension[] {
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

/**
 * Reconciles `fencedCodeLanguages.ts`'s lazily-loaded (`load`) entries with
 * the fact that `buildFencedCodeHighlighters` above needs each language's
 * concrete `Language` object *synchronously* to build its `scope`. Parsing
 * itself needs no equivalent fix — `@codemirror/lang-markdown`'s own
 * `getCodeParser` already calls `LanguageDescription.load()` and reparses
 * once it resolves, natively (`ParseContext.getSkippingParser`, confirmed
 * against its installed source) — this Compartment exists solely because
 * *highlighting* has no equivalent built-in deferral mechanism.
 *
 * `Compartment.reconfigure()` is CM6's own native mechanism for swapping
 * which extensions are active without touching document/selection/undo
 * state — not a custom loader, just the standard tool for "this set of
 * extensions needs to change after setup."
 */
const fencedCodeHighlightingCompartment = new Compartment();

/**
 * Scans currently-visible fenced blocks for a language that's registered
 * but not yet loaded, and starts loading it — `LanguageDescription.load()`
 * itself caches the in-flight/resolved promise on the instance (confirmed
 * against the installed `@codemirror/language` source: `this.loading ||
 * (this.loading = this.loadFunc().then(support => this.support = support))`),
 * so calling it redundantly here (it's already been triggered once,
 * internally, by `getCodeParser` parsing the same block) never triggers a
 * second dynamic import, and multiple fences of the same new language
 * across the document only ever load it once.
 *
 * Scoped to `view.visibleRanges`, matching every other fenced-code
 * decoration in this codebase (`fencedCodeLanguageLabelDecoration.ts`,
 * `fencedCodeCopyButtonDecoration.ts`) — a language referenced only by an
 * off-screen block loads once that block scrolls into view, not before.
 */
function ensureVisibleLanguagesLoaded(view: EditorView): void {
  const pending: Promise<unknown>[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== 'FencedCode') {
          return;
        }
        const codeInfo = node.node.getChild('CodeInfo');
        if (!codeInfo) {
          return;
        }
        const raw = view.state.sliceDoc(codeInfo.from, codeInfo.to);
        const normalized = /^\s*(\S*)/.exec(raw)?.[1] ?? '';
        if (!normalized) {
          return;
        }
        const matched = LanguageDescription.matchLanguageName(
          fencedCodeLanguageDescriptions,
          normalized,
          true
        );
        if (matched instanceof LanguageDescription && matched.support === undefined) {
          pending.push(matched.load());
        }
      },
    });
  }

  if (pending.length === 0) {
    return;
  }
  Promise.all(pending).then(() => {
    view.dispatch({
      effects: fencedCodeHighlightingCompartment.reconfigure(buildFencedCodeHighlighters()),
    });
  });
}

function fencedCodeLanguageLoader(): Extension {
  return ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        ensureVisibleLanguagesLoaded(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          ensureVisibleLanguagesLoaded(update.view);
        }
      }
    }
  );
}

export function fencedCodeHighlighting(): Extension[] {
  return [
    fencedCodeHighlightingCompartment.of(buildFencedCodeHighlighters()),
    fencedCodeLanguageLoader(),
  ];
}
