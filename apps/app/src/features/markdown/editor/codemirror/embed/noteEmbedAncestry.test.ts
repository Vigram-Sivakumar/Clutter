import { describe, expect, it } from 'vitest';

import { checkNoteEmbedAncestry, DEFAULT_MAX_EMBED_DEPTH, ROOT_ANCESTRY } from './noteEmbedAncestry';

describe('checkNoteEmbedAncestry', () => {
  it('allows a fresh page id, extending the ancestry set and depth', () => {
    const result = checkNoteEmbedAncestry(ROOT_ANCESTRY, 'page-a', DEFAULT_MAX_EMBED_DEPTH);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ancestry.ancestryPageIds.has('page-a')).toBe(true);
      expect(result.ancestry.depth).toBe(1);
    }
  });

  it('rejects a direct self-embed as a cycle', () => {
    const ancestry = { ancestryPageIds: new Set(['page-a']), depth: 0 };

    const result = checkNoteEmbedAncestry(ancestry, 'page-a', DEFAULT_MAX_EMBED_DEPTH);

    expect(result).toEqual({ ok: false, reason: 'cycle' });
  });

  it('rejects an indirect cycle (a page reappearing deeper in the chain)', () => {
    const ancestry = { ancestryPageIds: new Set(['page-a', 'page-b']), depth: 2 };

    const result = checkNoteEmbedAncestry(ancestry, 'page-a', DEFAULT_MAX_EMBED_DEPTH);

    expect(result).toEqual({ ok: false, reason: 'cycle' });
  });

  it('rejects once the max depth is reached, even for a page id never seen before', () => {
    const ancestry = { ancestryPageIds: new Set(['page-a']), depth: 2 };

    const result = checkNoteEmbedAncestry(ancestry, 'page-never-seen', 2);

    expect(result).toEqual({ ok: false, reason: 'depth-limit' });
  });

  it('allows exactly up to maxDepth, extending depth by one per call', () => {
    let ancestry = ROOT_ANCESTRY;
    for (let i = 0; i < 3; i++) {
      const result = checkNoteEmbedAncestry(ancestry, `page-${i}`, 3);
      expect(result.ok).toBe(true);
      if (result.ok) {
        ancestry = result.ancestry;
      }
    }
    expect(ancestry.depth).toBe(3);

    const overLimit = checkNoteEmbedAncestry(ancestry, 'page-3', 3);
    expect(overLimit).toEqual({ ok: false, reason: 'depth-limit' });
  });
});
