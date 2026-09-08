import type { Vault } from '@core/vault/models/Vault';
import type { Page } from '@core/vault/models/Page';
import type { EffectivePageState } from '@core/application/page/EffectivePageState';
import { VaultPath } from '@core/vault/ingest/VaultPath';
import type { PageEmbedResolution, ResolvePageEmbed } from '@features/markdown/render/blocks/pageEmbedResolution';

import { findPagesByAlias } from './resolveWikiLink';

/**
 * Composes `Vault` + `EffectivePageState` into the render layer's injected
 * `ResolvePageEmbed` boundary — `MarkdownReadRenderer`/`NoteEmbed` never
 * import either directly (same "editor/feature layer never imports Vault
 * directly" boundary `resolveWikiLink.ts`/`resolveEmbedImage.ts` already
 * respect). Path/alias lookup reuses `resolveWikiLink.ts`'s exact literal-
 * path-then-alias-fallback rule (`findPagesByAlias`, exported from there)
 * rather than a second implementation of the same target-resolution logic
 * — a note embed's `![[path|alias]]` names exactly the same kind of
 * reference a WikiLink's `[[path|alias]]` does.
 *
 * Content resolution is the one deliberate difference from
 * `resolveWikiLink.ts`: `EffectivePageState.getPage(id).markdown` (session-
 * wins-over-committed, ADR-020's existing precedence) rather than
 * `page.source.markdown` — an embedded note reflects the referenced page's
 * *current* content, including a live, unsaved edit, not just what was
 * last saved. `EffectivePageState.getPage()` is synchronous and side-
 * effect-free (safe to call once per render), so this needs no new
 * subscription/session-awareness of its own.
 */
export function createPageEmbedResolver(vault: Vault, effectivePageState: EffectivePageState): ResolvePageEmbed {
  function resolvedTo(page: Page): PageEmbedResolution {
    const effective = effectivePageState.getPage(page.id);
    const markdown = effective?.markdown ?? page.source.markdown;
    const name = effective?.name ?? '';
    const title = name.trim().length > 0 ? name : VaultPath.pageName(page.path);

    return { status: 'resolved', pageId: page.id, title, markdown };
  }

  return (path) => {
    const literal = vault.getPageByPath(`${vault.root}/${path}.md`);
    if (literal) {
      return resolvedTo(literal);
    }

    const aliasMatches = findPagesByAlias(vault, path);
    if (aliasMatches.length === 1) {
      return resolvedTo(aliasMatches[0] as Page);
    }

    if (aliasMatches.length > 1) {
      return { status: 'ambiguous', displayLabel: VaultPath.pageName(path) };
    }

    return { status: 'unresolved', displayLabel: VaultPath.pageName(path) };
  };
}
