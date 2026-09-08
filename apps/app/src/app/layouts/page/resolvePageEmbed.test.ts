import { describe, expect, it, vi } from 'vitest';

import { Vault } from '@core/vault/models/Vault';
import { VaultProjectionBuilder } from '@core/vault/knowledge/VaultProjectionBuilder';
import { TagBuilder } from '@core/vault/knowledge/TagBuilder';
import { KnowledgeGraph } from '@core/vault/models/graph/KnowledgeGraph';
import type { Page } from '@core/vault/models/Page';
import type { EffectivePageState } from '@core/application/page/EffectivePageState';

import { createPageEmbedResolver } from './resolvePageEmbed';

function makeVault(pages: Page[]): Vault {
  return new Vault(
    '/vault',
    pages,
    [],
    new TagBuilder().build(pages),
    [],
    [],
    new KnowledgeGraph([]),
    new VaultProjectionBuilder()
  );
}

const defaultPageMetadata = {
  icon: null,
  cover: null,
  description: '',
  favorite: false,
  status: 'active' as const,
  archivedAt: null,
  originalParentId: null,
  originalPath: null,
  createdAt: null,
  updatedAt: null,
};

function makePage(overrides: Partial<Page> & Pick<Page, 'id' | 'path' | 'name'>): Page {
  return {
    type: 'note',
    parentId: null,
    metadata: defaultPageMetadata,
    source: { markdown: '' },
    analysis: { headings: [], aliases: [], blockReferences: [], tasks: [], tags: [], links: [], embeds: [] },
    ...overrides,
  };
}

/** Duck-typed test double — `resolvePageEmbed.ts` only ever calls `.getPage(id)`. */
function makeEffectivePageState(getPage: (id: string) => { name: string; markdown: string } | undefined): EffectivePageState {
  return { getPage } as unknown as EffectivePageState;
}

describe('createPageEmbedResolver', () => {
  it('resolves a literal vault-relative path and returns the durable markdown when no session is open', () => {
    const page = makePage({ id: 'p1', path: '/vault/Notes/Alpha.md', name: 'Alpha', source: { markdown: '# Alpha' } });
    const vault = makeVault([page]);
    const effectivePageState = makeEffectivePageState(() => undefined);

    const resolve = createPageEmbedResolver(vault, effectivePageState);
    const result = resolve('Notes/Alpha');

    expect(result).toEqual({ status: 'resolved', pageId: 'p1', title: 'Alpha', markdown: '# Alpha' });
  });

  it('returns the effective (live/session) markdown when EffectivePageState reports one, not the durable copy — Model B', () => {
    const page = makePage({ id: 'p1', path: '/vault/Alpha.md', name: 'Alpha', source: { markdown: 'Old content' } });
    const vault = makeVault([page]);
    const effectivePageState = makeEffectivePageState((id) =>
      id === 'p1' ? { name: 'Alpha', markdown: 'New uncommitted content' } : undefined
    );

    const resolve = createPageEmbedResolver(vault, effectivePageState);
    const result = resolve('Alpha');

    expect(result).toEqual({ status: 'resolved', pageId: 'p1', title: 'Alpha', markdown: 'New uncommitted content' });
  });

  it('resolves via alias when no literal path matches', () => {
    const page = makePage({
      id: 'p1',
      path: '/vault/Projects/Alpha.md',
      name: 'Alpha',
      analysis: { headings: [], aliases: [{ value: 'Alpha Project' }], blockReferences: [], tasks: [], tags: [], links: [], embeds: [] },
    });
    const vault = makeVault([page]);
    const effectivePageState = makeEffectivePageState(() => undefined);

    const resolve = createPageEmbedResolver(vault, effectivePageState);
    const result = resolve('Alpha Project');

    expect(result).toMatchObject({ status: 'resolved', pageId: 'p1' });
  });

  it('returns ambiguous when more than one page shares the same alias', () => {
    const alias = [{ value: 'Shared' }];
    const p1 = makePage({ id: 'p1', path: '/vault/A.md', name: 'A', analysis: { headings: [], aliases: alias, blockReferences: [], tasks: [], tags: [], links: [], embeds: [] } });
    const p2 = makePage({ id: 'p2', path: '/vault/B.md', name: 'B', analysis: { headings: [], aliases: alias, blockReferences: [], tasks: [], tags: [], links: [], embeds: [] } });
    const vault = makeVault([p1, p2]);
    const effectivePageState = makeEffectivePageState(() => undefined);

    const resolve = createPageEmbedResolver(vault, effectivePageState);
    expect(resolve('Shared')).toEqual({ status: 'ambiguous', displayLabel: 'Shared' });
  });

  it('returns unresolved when no page matches by path or alias', () => {
    const vault = makeVault([]);
    const effectivePageState = makeEffectivePageState(() => undefined);

    const resolve = createPageEmbedResolver(vault, effectivePageState);
    expect(resolve('Nonexistent Note')).toEqual({ status: 'unresolved', displayLabel: 'Nonexistent Note' });
  });

  it('never calls DocumentSession/DocumentRegistry directly — only EffectivePageState.getPage', () => {
    const page = makePage({ id: 'p1', path: '/vault/Alpha.md', name: 'Alpha' });
    const vault = makeVault([page]);
    const getPage = vi.fn().mockReturnValue(undefined);
    const effectivePageState = makeEffectivePageState(getPage);

    createPageEmbedResolver(vault, effectivePageState)('Alpha');

    expect(getPage).toHaveBeenCalledWith('p1');
    expect(getPage).toHaveBeenCalledTimes(1);
  });
});
