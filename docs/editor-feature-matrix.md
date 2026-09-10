# Clutter — Markdown Editor Feature Matrix

What Obsidian, Notion, and Craft support, what Clutter's Lezer grammar and editor stack actually implement today, and what's left to build. This is the sequencing reference for v1 editor implementation work — not a spec and not a plan; each Category B item still needs its own pass through `docs/implementation-rules.md` before code is written.

**Method.** Clutter's current state is read directly from `apps/app/src/features/markdown/editor/codemirror/buildEditorExtensions.ts` (the single source of truth for what's actually wired into the running editor), `markdownGrammarExtensions.ts`/`markdownLanguage.ts` (what the parser accepts), `inlineLivePreviewParticipants.ts` (the shared inline-formatting registry), the individual construct directories under `codemirror/`, and their test suites — not assumed from a construct's source code existing, and not taken on faith from `docs/editor-architecture-decisions.md`'s own narrative log, which records history chronologically and is not kept retroactively current. Where this matrix and that log disagree on *current* wiring, this matrix's own direct-source verification wins; the log remains the correct place to understand *why* something is built the way it is. Competitor columns reflect each product's core feature set, not third-party plugins (e.g. Obsidian community plugins are excluded).

**Categories.** A — already implemented and wired. B — missing, should build for v1. C — competitor feature, not appropriate for Clutter. D — future / intentionally out of scope.

**"Implemented" (Category A) means both the source code exists AND it is currently wired into `buildEditorExtensions.ts`** (or, for grammar-only facts, into `markdownGrammarExtensions.ts`) — checked directly against those two files for this revision, not inferred from a decoration file's presence. A row is annotated **"— built but not wired"** for the one remaining case where full source and tests exist but the extension is never imported at the wiring layer (Tables — see that row). Every other Category A row below is both implemented and currently live in the running editor as of this revision.

**Last verified:** 2026-09-10 (branch `markdown`), via direct inspection of `buildEditorExtensions.ts`, `markdownGrammarExtensions.ts`, `inlineLivePreviewParticipants.ts`, and the relevant construct/test directories — not from git log dates. This revision **supersedes the entire previous version of this matrix** (last verified 2026-08-24, commit `76e657ee`), most of which had gone stale: at that time, `MarkdownEditor.tsx` built its extension list inline and most decorations really were commented out. `MarkdownEditor.tsx` has since been refactored to delegate to `buildEditorExtensions.ts`, and a large amount of construction and re-enablement work landed after that date (emphasis/strikethrough/highlight/inline-code/link/autolink unified under one shared mechanism; heading, blockquote, horizontal-rule, list, and task decorations all re-enabled; Tab/Shift-Tab list indent and ordered-list renumbering shipped; Embed/PDF/note-embed built and wired end-to-end). Specific corrections from the prior revision are called out inline as **"Corrected 2026-09-10"**.

---

## Inline formatting (16 items)

Character-level marks and spans — the things that live inside a line of text. Bold, Italic, Strikethrough, Highlight, Inline code, Link, and Autolink are all registered participants of one shared mechanism (`inlineLivePreviewParticipants.ts` + `inlineLivePreviewRegion.ts`); WikiLink, Tag, Date, Image are each their own standalone mechanism (documented reasons in `docs/editor-architecture-decisions.md`).

| Feature | Obsidian | Notion | Craft | Clutter | Cat. | Layer (if B) |
|---|---|---|---|---|---|---|
| Bold `**text**` | ✓ | ✓ | ✓ | Implemented and wired — shared `delimitedInlineRenderer` participant, concealed-marker widget at rest, full reveal on engagement | A | — |
| Italic `*text*` | ✓ | ✓ | ✓ | Same mechanism as Bold, same participant family | A | — |
| Strikethrough `~~text~~` | ✓ | ✓ | ✓ | **Corrected 2026-09-10 (previously listed as disabled) — implemented and wired**: shared participant, same as Bold/Italic | A | — |
| Inline code `` `code` `` | ✓ | ✓ | ✓ | **Corrected 2026-09-10 (previously listed as disabled) — implemented and wired**: shared participant | A | — |
| Plain link `[text](url)` | ✓ | ✓ | ✓ | Shared participant; deliberately non-atomic, ordinary Live Preview mark (Locked) | A | — |
| Autolink `<url>`, bare URL | ✓ | ✓ | ✓ | Autolink is a shared participant (`tok-link`); bare `URL` gets its own minimal non-concealing renderer, same class, click-to-navigate wired | A | — |
| Image `![alt](url)` | ✓ | ✓ | ✓ | Standalone mechanism, atomic semantic-token family; resize handle, options menu, overlay all wired | A | — |
| WikiLink `[[Page]]`, `[[Page\|alias]]` | ✓ | – | – | Full grammar, resolution, autocomplete, standalone live-preview widget, click activation — all wired | A | — |
| Tag `#tag` | ✓ | – | – | Full grammar, resolution, autocomplete, widget decoration, click activation — all wired | A | — |
| Date `@2026-08-21` | plugin | – | – | Clutter-specific `@`-family token, full lifecycle, widget decoration wired | A | — |
| Highlight `==text==` | ✓ | bg color | ✓ | Custom grammar node, variable-length `=` run support, widget/marker decoration wired | A | — |
| Nested inline class composition (`tok-wikilink tok-strong tok-strike`, etc.) | n/a | n/a | n/a | **New row, 2026-09-10.** `collectActiveInlineClasses` composes every enclosing delimited-mark construct's class directly onto a widget's root element — depth/order/combination-agnostic by construction | A | — |
| Completed-task inline composition (`cm-task-completed`) | n/a | n/a | n/a | **New row, 2026-09-10.** Composed the same way as the row above, from a second independent state source (`isNodeOnCompletedTask`) | A | — |
| Embed / transclusion `![[Page]]` | ✓ | sub-page | link block | **Corrected 2026-09-10 (previously listed as unbuilt, Category B) — implemented and wired.** Distinct `Embed` grammar node, resolves to image, PDF, or note embed; note-embed has its own nested read-only `EditorView`, Expand/Turn-into-WikiLink/Remove actions, and cycle/depth-protected recursion guard | A | — |
| Mention `@Person` | – | ✓ | limited | Not registered — explicitly named as the next `@`-family kind, deliberately deferred per the "leave an extension point, don't build the coordinator" posture Date already proved out | B | Lezer grammar, semantic token, resolution, autocomplete, tests |
| Inline property `@due:2026-01-01` | plugin | – | – | `PropertyToken` named in the architecture log, deliberately deferred, same posture as Mention | B | Lezer grammar, semantic token, validate, tests |
| Subscript / superscript `~sub~` `^sup^` | ✓ | ✓ | – | Not present; low authoring frequency in note-taking use cases | D | Revisit if a concrete use case appears |
| Footnotes `[^1]` | ✓ | – | – | No footnote extension shipped in `@lezer/markdown` core; would need an external/custom parser | D | Reconsider post-v1 if long-form writing becomes a priority |
| Inline/block HTML | ✓ | – | – | **New row, 2026-09-10.** Not registered, decorated, escaped, or tested anywhere in Clutter's own code; whatever `@lezer/markdown`'s un-removed default HTML parsing does with it is unverified/unmanaged behavior, not a deliberate feature | D | Revisit only if raw-HTML authoring becomes a real user scenario |
| Inline comment `%%hidden%%` | ✓ | – | – | Niche; Notion/Craft solve "hidden text" with page comments instead, a different concept | D | — |
| Per-character text/background color | plugin | ✓ | ✓ | Not representable in portable Markdown without non-standard syntax or inline HTML spans | C | Conflicts with "Markdown is the sole canonical source" (Locked) |
| Emoji shortcode `:smile:` | plugin | ✓ | ✓ | Not core CommonMark/GFM; inconsistent across competitors' own core products. (Clutter does have an unrelated, genuinely custom `emoji-list` grammar extension — see Block formatting section) | C | Users can already type Unicode emoji directly |

---

## Block formatting (14 items)

Structural, line- or paragraph-level constructs.

| Feature | Obsidian | Notion | Craft | Clutter | Cat. | Layer (if B) |
|---|---|---|---|---|---|---|
| ATX / Setext headings `# … ######` | ✓ | ✓ | ✓ | Native grammar + marker decoration, wired; nested inline formatting composes correctly inside heading text | A | — |
| Paragraphs, hard breaks, horizontal rule | ✓ | ✓ | ✓ | Native CommonMark `---`/`***`/`___`, plus Clutter's own `~---~`/`=---=`/`.---.`/labeled variants — all wired (`horizontalRuleDecoration()`) | A | — |
| Blockquote `> text` (incl. nested `>>`) | ✓ | ✓ | ✓ | Marker concealment + left-rule line decoration, both wired; nested-depth and lazy-continuation cases covered by tests | A | — |
| Bullet lists | ✓ | ✓ | ✓ | Styled bullet glyph, marker decoration, wired | A | — |
| Ordered lists — numbering (create/Enter/Backspace) | ✓ | ✓ | ✓ | **Corrected 2026-09-10 (previously listed as disabled) — implemented and wired.** Digit-width shrink/growth structural-corruption bug found and fixed (`markdownEnterKeymap.ts`'s `continueMarkupPreservingStructure`) | A | — |
| Ordered lists — Tab/Shift-Tab renumbering | ✓ | ✓ | ✓ | **New row, 2026-09-10.** Shipped 2026-08-30 (`orderedListTabNormalization.ts`, `orderedListStructuralNormalization.ts`) — moving an item in/out of nesting via Tab/Shift-Tab renumbers both the source and destination lists | A | — |
| Ordered lists — Tab-nesting structural edge cases | — | — | — | **Known, accepted limitation, not a v1 gap to schedule** — see Known Architectural TODOs below. Tab on a selection spanning a list's first item, and partial Shift-Tab on part of a nested group, are formally concluded "Case C" (accepted CommonMark-driven limitation of the current flat-step model), not implementable as an ordinary bug fix without reopening a Locked, previously-reverted design | D (for now) | Reopen only with a concrete, driving product need — see `docs/list-item-architecture-odr.md` §17/§18 |
| Task checkbox `- [ ]` / `- [x]` | ✓ | ✓ | ✓ | GFM `TaskList` node, interactive/clickable widget, wired to the Tasks feature; completion metadata (`@done`-style) and completed-task inline strikethrough composition both wired | A | — |
| Fenced code block | ✓ | ✓ | ✓ | **Corrected 2026-09-10 (eighth pass same day — language label reverted to left/in-flow position, Copy button hover-reveal).** CSS-only placement/visibility correction, smallest existing implementation touched: `.cm-code-block-language` reverted from `position: absolute` (top-right, prior pass) back to normal inline flow at its own document position (left-aligned, where the user typed the language); `.cm-code-block-copy` now hidden at rest (`opacity: 0; pointer-events: none`) and revealed via `.cm-code-block:hover`/`:focus-within` reaching it through the existing `blockWrappers` wrapper — no new container. Neither decoration's insertion mechanism changed. Verified live with two adjacent blocks: independent hover-reveal confirmed per block, full language names (`js`→`JavaScript`, `py`→`Python`) still resolve correctly at the new position. **Seventh pass same day (selection-vs-card-background contrast)**: `.cm-code-block-line` background changed from opaque to `color-mix(in srgb, var(--surface-secondary) 55%, transparent)` (dark theme) / `var(--surface-tertiary)` (light theme, since `--surface-secondary` == `--surface-root` there) — root-caused against CM6's `LayerView` source (`.cm-selectionLayer` is deliberately negative-z-index, same precedent as `.cm-activeLine`'s own alpha-channel color), not a guessed `z-index` fix. Dark theme locked; light theme's selection-on-card contrast improved but stayed marginal — a disclosed, accepted limitation, native `layer()` remains the documented fallback. **Sixth pass (`margin` banned everywhere in the path, visual card restored to `.cm-line`)**: real interactive testing found `margin` breaks CM6 cursor/navigation even on `.cm-code-block` (the `blockWrappers` wrapper), not just `.cm-line` — the hard rule is "no `margin` anywhere in the fenced-code layout path," not "no styling of any kind on `.cm-line`." Responsibility split: `.cm-code-block` (`highlight/fencedCodeBlockWrapper.ts`) owns structural grouping + `padding-block` spacing only; `.cm-code-block-line`/`--first`/`--last` (`highlight/fencedCodeBlockLineDecoration.ts`, `Decoration.line` — the same native mechanism blockquote/table/horizontal-rule already use) owns the visual card (background/border/radius/horizontal padding). Native `codeLanguages` highlighting and fence-marker reveal-on-engagement are unchanged in mechanism throughout all three passes. **Known, separate, pre-existing issue, still open**: a mouse drag ending near a block's closing fence over-extends the selection — isolated to `fencedCodeMarkerDecoration.ts`'s `liveMarkSelectionSnap.ts` reuse, not the container. **Also implemented and wired (ninth pass, documented retroactively in `docs/editor-architecture-decisions.md`)**: an "Actions" menu (Change Language submenu, reusing `fencedCodeLanguageDescriptions` as its sole source of truth; Remove, deleting the whole block) and a separate, always-visible Format button (Prettier-backed, JavaScript/JSX/TypeScript/TSX/JSON/CSS/HTML — no Python parser). **Tenth pass**: JSX/TSX are now first-class registry entries (8 languages total), not JavaScript/TypeScript aliases — selectable from Change Language, displaying their own label, while plain JavaScript/TypeScript keep parsing embedded JSX permissively (unchanged) | A (container, Actions menu, Change Language, Format, Remove); B (drag-near-closing-fence over-extension); C (light-theme selection-on-card contrast, marginal) | Investigate `liveMarkSelectionSnap.ts`'s `'node-range'` snap-to-boundary logic for pointer-drag interaction with multi-line constructs; consider native CM6 `layer()` for full light-theme selection contrast if needed |
| Indented code block | ✓ | ✓ | ✓ | **Deliberately removed from the grammar** (`{ remove: ['IndentedCode'] }`), not merely unbuilt — a 4-space-indented block now parses as an ordinary paragraph; fenced code is the only supported way to author code. An accepted, documented interop cost, not a gap | D | Reverting this trades away the current deep-indentation ceiling design; not a v1 candidate |
| Tables (GFM pipe tables) | ✓ | ✓ | ✓ | **Corrected 2026-09-10 (previously listed as fully disabled) — built but not wired.** Grammar (`Table`) is enabled; `tableDecoration()`/`tableAlignment.ts` are a complete, tested (26+ cases: alignment, per-row engagement, nested-construct composition, Setext/Table precedence) Phase 1 implementation — it is simply never imported into `buildEditorExtensions.ts`. This is the single highest-leverage remaining item: a wire-and-verify task, not a build task | B (wiring only) | Import into `buildEditorExtensions.ts`, re-verify composition against the current inline mechanism, confirm in the real app |
| Callouts `> [!note]` | ✓ | callout block | highlight block | Not present; needs a custom block parser extending Blockquote | B | block parser, widget, CSS, autocomplete, tests |
| Foldable headings / lists | ✓ | ✓ | ✓ | No `foldService` wired; CM6 supports this natively but it isn't configured | B | editor keymap/interaction, decoration, CSS |
| Math `$inline$` / `$$block$$` | ✓ | ✓ | limited | Needs a rendering engine (KaTeX) and custom parser — substantial standalone effort | D | Strong v2 candidate given Obsidian + Notion both support it; not a v1-scope fit |
| Mermaid diagrams | plugin | – | – | Not present, not referenced anywhere in the codebase or prior research | D | Revisit only if diagram authoring becomes a named product need |
| Frontmatter / Properties block (YAML) | ✓ | ✓ (as page props) | – | No YAML/Properties block parser exists | D | Revisit alongside Mention/PropertyToken if page-level structured metadata becomes a priority |
| Block reference `^blockid` | ✓ | – | – | Niche; no concrete need identified yet | D | Revisit only if block-level backlink granularity is requested |
| Definition lists | plugin | – | – | Not core to any of the three competitors | C | — |
| External embeds (video, PDF, web bookmark) | ✓ | ✓ | ✓ | Note transclusion and PDF-resource embeds are both built and wired (see Inline formatting's Embed row); a *fetched* external embed (arbitrary video/web bookmark) is still out of scope — needs its own fetch/render/security model | D | Out of scope until an embed-fetching trust model is designed |
| Emoji-list syntax (custom) | – | – | – | **New row, 2026-09-10.** A genuine Clutter-specific grammar extension (`emoji-list/emojiListSyntax.ts`), registered and wired, not present in any competitor and not previously documented in this matrix | A | — |

---

## Editor interaction & UX (7 items)

Not Markdown syntax itself, but the authoring behavior competitors are actually being compared on.

| Feature | Obsidian | Notion | Craft | Clutter | Cat. | Layer (if B) |
|---|---|---|---|---|---|---|
| Reveal-on-engagement Live Preview | ✓ | n/a — block model | n/a — block model | **Corrected 2026-09-10 (previously "only the emphasis family") — the shared mechanism now covers every registered inline participant** (Bold, Italic, Strikethrough, Highlight, Inline code, Link, Autolink) plus every standalone family (WikiLink, Tag, Date, Image, Embed) and every block-level construct (headings, blockquotes, lists, HR) | A | — |
| Autocomplete for links/tags/dates/embeds | ✓ | ✓ | limited | Full completion sources for WikiLink, Tag, Date, and Embed (image/PDF/note target suggestions) | A | — |
| Typing shortcuts `**` → bold, `-` → list, `>` → quote, `---` → divider | ✓ | ✓ | ✓ | **Corrected 2026-09-10 — fully live**: every marker-decoration family named above (bold/italic/strike/highlight/code/heading/blockquote/list/HR) reveal-styles the instant the caret leaves it. `formatShortcutsKeymap()` additionally provides Cmd/Ctrl-B/-I keyboard shortcuts to apply formatting to a selection without hand-typing the marker pair | A | — |
| Smart list continuation (Enter continues, Tab indents) | ✓ | ✓ | ✓ | **Corrected 2026-09-10 (previously "Tab/Shift-Tab missing") — fully implemented.** Enter-continues/empty-item-exits via CM6's own `markdownKeymap` defaults; Tab/Shift-Tab indent/dedent (`markdownIndentKeymap.ts`) including ordered-list renumbering on nesting changes, both wired | A | — |
| Slash command menu | plugin | ✓ | ✓ | A real block-inserter UX, not yet designed for Clutter's plain-text model | D | Candidate to build on the existing autocomplete pattern once scoped |
| Drag-and-drop block reordering | plugin | ✓ | ✓ | Implies a structural block model layered over plain text | C | Tension with "no second document model" (Locked) — would need its own ADR before reconsidering |
| Per-block font family / size controls | – | limited | ✓ | Not representable in portable Markdown | C | Same rationale as per-character color, above |

---

## Known architectural TODOs (tracked, not silently decided)

Carried forward from `docs/list-item-architecture-odr.md`'s own consolidated open-questions section — genuinely unresolved, not implicitly closed by anything in this revision:

- **Ordered-list Tab-nesting structural hazards** (§17, consolidated item 12): Tab on a selection including a list's first item produces a degenerate non-nesting result; partial Shift-Tab on part of a nested group can destroy a sibling's list-item structure. Formally concluded **Case C — an accepted limitation**, not schedulable as an ordinary bug fix under the current flat-step Tab model (§18.16); both hazards reproduce identically through plain unmodified CM6 commands, confirming they are not Clutter-specific defects.
- **Cross-line content-column alignment** for ordered markers of differing digit width (§13.4/§13.9) — accepted cosmetic limitation, not fixable without whole-list-aware marker-width measurement.
- **Delete-forward at a marker boundary** has zero Markdown awareness — deferred, symmetric across bullet and ordered lists (§8/§13.9).
- **Task-list architectural questions** (§12) remain genuinely open, including whether ordered task items behave identically to bullet task items (assumed but not independently verified).
- **Mouse hit-testing at a concealed marker's own sub-pixel position** is inconclusive — no trusted OS-level click was available during that investigation; the keyboard path is fully verified.
- **Accessibility of concealed markers** is inconclusive — no real screen-reader pass has been run; marker punctuation may now be exposed to assistive tech in a way the prior `Decoration.replace({})` mechanism never exposed it.
- **A named, unfixed composition gap**: `wikiLinkLivePreview.ts`'s ancestor-widening check can false-positive on `Link`'s shared `LinkMark` naming, causing a WikiLink nested inside a `Link` label to spuriously reveal from a cursor position nowhere near it (`docs/editor-architecture-decisions.md`, "A live, already-shipped side effect discovered while investigating `Link`").

---

## Next step

**Wire up Tables.** It is the single highest-leverage, lowest-risk item on this matrix: no new grammar, no new decoration code, and no new tests to write — `tableDecoration()` already exists, is fully tested, and only needs to be imported into `buildEditorExtensions.ts`. The remaining work is verification (re-confirm composition against the current inline-formatting mechanism, which has changed since tables' own composition fixes were last checked) and a real-app pass, not new construction.

After Tables, per this matrix's own priority ordering: fenced-code language syntax highlighting (self-contained, no dependency on other constructs), then Callouts (reuses existing Blockquote infrastructure patterns), then Mention/PropertyToken (the `@`-family extension point already exists and was proven out by Date).

Per the operational contract: read `docs/implementation-rules.md`, confirm the relevant section of `docs/architecture-specification.md`, then implement.
