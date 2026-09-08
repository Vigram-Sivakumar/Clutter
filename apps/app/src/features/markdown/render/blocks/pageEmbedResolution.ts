/**
 * The injected note-embed resolution contract — mirrors `ResolveWikiLink`'s
 * shape (same `resolved`/`ambiguous`/`unresolved` states, same alias
 * fallback semantics) rather than inventing a second target-resolution
 * vocabulary, since a note embed (`![[Some Note]]`) targets exactly the
 * same kind of reference a WikiLink does. `markdown` is the resolved
 * page's *effective* content (session-wins-over-committed, via
 * `EffectivePageState` — ADR-020's existing precedence, reused unchanged,
 * never a second draft-vs-committed resolution mechanism) — composed in
 * the app layer (`resolvePageEmbed.ts`), never resolved by the renderer
 * itself, which never imports `Vault`/`EffectivePageState`.
 */
export type PageEmbedResolution =
  | { readonly status: 'resolved'; readonly pageId: string; readonly title: string; readonly markdown: string }
  | { readonly status: 'ambiguous'; readonly displayLabel: string }
  | { readonly status: 'unresolved'; readonly displayLabel: string };

export type ResolvePageEmbed = (path: string) => PageEmbedResolution;
