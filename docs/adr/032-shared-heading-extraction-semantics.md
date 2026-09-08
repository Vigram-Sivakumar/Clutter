# ADR-032: Shared Heading Extraction and Matching Semantics

**Status:** Accepted (design frozen; implementation may proceed against this contract)

## Context

Two independent investigations — note-embed heading-target research, followed by a dedicated pre-implementation architecture review — traced how `![[Page#Heading]]` resolution should work.

The review surfaced that a heading-lookup pipeline already exists and ships today: `HeadingExtractor` (regex-based, Vault Ingest, internal) populates `Page.analysis.headings`, and `PageIndex.findHeading` (internal, Vault Domain Model) performs exact-text, first-match-in-document-order lookup against it — the sole consumer being `LinkResolver`'s link/embed fragment validation.

That pipeline is Durable-only by construction (`HeadingExtractor` is invoked only from `PageBuilder`/`PageRebuilder`, both operating on already-written content). The planned note-embed feature requires heading resolution against `EffectivePageState`'s live (session-wins-over-committed) markdown, per the architecture's own existing precedent for reconciling Committed vs. Durable content for presentation (ADR-020). Reusing `HeadingExtractor`/`PageIndex` unchanged would silently resolve against stale content while a target page is open and edited; writing a second, independent heading parser for the live path would duplicate the same semantic rule.

Direct verification (against the real, installed `@lezer/markdown@1.7.2`, not assumed) confirmed:

- `HeadingExtractor`'s algorithm is already pure — a function of a markdown string alone, with no Vault/Page/ingest-state dependency — and is separable from its durable-specific callers.
- `PageIndex.findHeading`'s matching rule (exact text, first match) is a two-line predicate, equally separable from `PageIndex`'s own storage.
- The regex implementation has a real correctness gap: a line beginning literally with `#` inside a fenced code block can be falsely detected as a heading, since the regex has no fence awareness.
- `> # Heading` inside a blockquote is parsed by the real grammar as a genuine `ATXHeading1` node nested inside `Blockquote`, while today's line-anchored regex excludes it (the `>` occupies the position the regex requires `#` to start at).
- `Heading`'s own doc comment already states an existing design intent — "intentionally independent of the Markdown parser implementation" — meaning any position data a live consumer needs must live in a richer internal representation, never leaking into `Heading`/`ScannedHeading`'s existing public shape.

## Decision

### 1. One shared, pure heading-extraction API, newly public from Vault Ingest

Add, as a new public (`+`) export of Vault Ingest (`architecture-specification.md` §2):

```ts
export interface HeadingOccurrence {
  readonly level: number;
  readonly text: string;
  readonly from: number;   // source offset, per @lezer/markdown's ATXHeadingN.from
}

export function extractHeadingOccurrences(
  markdown: string,
): readonly HeadingOccurrence[];

export function findFirstHeadingOccurrence<T extends { readonly text: string }>(
  occurrences: readonly T[],
  text: string,
): T | undefined;
```

`extractHeadingOccurrences` is grammar-based, using the bare `@lezer/markdown` parser — no Clutter grammar extensions are required, since none of the registered extensions (`WikiLink`/`Embed`/`Tag`/`Date`/etc.) alter `ATXHeading1`–`6` parsing. Only `ATXHeading1`–`6` nodes that are **direct children of `Document`** are considered document headings — deliberately excluding headings nested inside `Blockquote`/list items. Heading `text` is the node's inline content reduced to plain text (mark nodes — `HeaderMark`, emphasis marks, link/wikilink nodes — stripped), not raw Markdown syntax.

`findFirstHeadingOccurrence` is the existing `PageIndex.findHeading` matching rule (exact string equality, first match in document order), extracted verbatim as its own generic function so both `Heading[]`-shaped and `HeadingOccurrence[]`-shaped inputs can use it.

### 2. Existing durable consumers become thin callers, unchanged in public shape

`HeadingExtractor.extract(content)` (internal, unchanged signature) delegates to `extractHeadingOccurrences(content)` and maps `{level, text, from}` → `{level, title}` — `ScannedHeading`'s shape is untouched; every existing durable consumer (`MarkdownAnalyzer`, `PageBuilder`, `PageRebuilder`, `Page.analysis.headings`) is unaffected in output shape.

`PageIndex.findHeading(pageId, heading)` (internal, unchanged signature) delegates to `findFirstHeadingOccurrence` against `page.analysis.headings`. `PageIndex` remains the sole internal durable index; it gains no new export and is not itself made public.

### 3. Live consumers call the same functions directly

Any future live-render consumer (heading-target note embeds, heading autocomplete — not implemented by this ADR) calls `extractHeadingOccurrences(effectivePageState.getPage(id).markdown)` and `findFirstHeadingOccurrence(...)` directly — a downward import from UI/Features into Vault Ingest, permitted by the existing dependency diagram (`ARCHITECTURE_RULES.md` rule 7). Neither `PageIndex` nor `Page.analysis` is imported by this path. Section-boundary extraction (`markdown.slice(match.from, next?.from ?? markdown.length)`, where `next` is the following occurrence with `level <= match.level`) is a thin function layered directly on `HeadingOccurrence[]`'s `from` field — not a separate capability, not separately owned.

Durable and live consumers therefore differ only in which markdown string they supply, never in how headings are found or matched.

## Alternatives Considered

**A — Promote `HeadingExtractor` itself to a public collaborator.** Rejected: solves visibility but not shape — `ScannedHeading` carries no position, and UI/Features needs `from` for section-boundary extraction. Promoting the class as-is doesn't fully solve the need without also changing its return shape, which risks conflating "the durable extractor" with "the general reusable semantics API" in one class identity.

**B — Let a future live-render feature independently reimplement heading extraction and matching.** Rejected: directly violates this project's standing principle against duplicate implementations of the same semantic rule — two independently-maintained answers to "what counts as a heading" and "how are duplicates resolved" is exactly the failure mode this investigation exists to avoid.

**C — House the shared function in a new location outside the twelve subsystems (a "Markdown Semantics" layer).** Rejected: unjustified per `ARCHITECTURE_RULES.md`'s "How to decide whether a new subsystem is justified" — extraction rules are already Vault Ingest's stated, existing responsibility (§2 Ownership: "Owns: ...extraction rules"); Vault Ingest is already a legal shared dependency for any higher layer, so no structural gap remains for a new subsystem to close.

## Non-Goals (explicit exclusions, not silent gaps)

- Does not implement `MarkdownReadRenderer`, `NoteEmbed`, or any heading autocomplete UI — this ADR establishes only the shared extraction/matching primitives those features will later consume.
- Does not change `PageIndex`'s internal storage strategy (still a linear scan; `PageIndex.ts`'s own `TODO(v2)` about dedicated indexes is untouched and out of scope here).
- Does not decide whether blockquote-nested headings should ever be selectable as note-embed targets in a future UI — only that the shared extraction function does not surface them as top-level document headings by default.
- Does not give `EffectivePageState` a formal `architecture-specification.md` section — that is a separate, pre-existing documentation-reconciliation gap, unrelated to this ADR's narrow scope, and remains explicitly out of scope here.
- Does not change `Vault`, `PageOperations`, the Persistence Gate, Sync, or any write path. Does not change `DocumentSession`/`DocumentRegistry`, and neither is imported by anything this ADR adds.

## Consequences

- Exactly one implementation of heading-extraction and heading-matching semantics exists; durable and live consumers differ only in which markdown string they supply.
- `Page.analysis.headings`'s output values change in one confirmed way relative to today's regex: blockquote-nested `> # ...` lines remain excluded from top-level heading extraction, now for an explicit, structural reason (direct-children-of-`Document` restriction) rather than regex coincidence — the observable outcome for this case is unchanged. A fenced code block containing a line starting literally with `#` changes from a possible false-positive durable heading today to correctly excluded — a deliberate, desirable correctness fix.
- No existing test needs deletion or modification — verified directly: no test in the repository exercises the fenced-code or blockquote boundary today.
- `Heading`/`ScannedHeading` gain no parser-specific fields; `HeadingOccurrence`'s `from` field exists only in the new shared extraction API.
- No new subsystem. No change to `Vault`, `PageOperations`, the Persistence Gate, Sync, or any write path.

## Why This Approach Is Preferred

It is the only option that satisfies both stated requirements simultaneously: exactly one implementation of heading semantics, and durable/live consumers that share that implementation without depending on each other's storage or indexing mechanisms. It requires the smallest possible specification amendment — one new `+` entry in an already-existing section — and changes no existing public contract's shape.
