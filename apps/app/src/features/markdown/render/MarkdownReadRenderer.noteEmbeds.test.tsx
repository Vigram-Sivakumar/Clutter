// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { PageEmbedResolution } from './blocks/pageEmbedResolution';
import { DEFAULT_MAX_EMBED_DEPTH } from './blocks/NoteEmbed';
import { MarkdownReadRenderer } from './MarkdownReadRenderer';

afterEach(() => {
  cleanup();
});

interface FakeNote {
  readonly pageId: string;
  readonly title: string;
  readonly markdown: string;
}

function makeResolver(notesByPath: Record<string, FakeNote>) {
  return (path: string): PageEmbedResolution => {
    const note = notesByPath[path];
    if (!note) {
      return { status: 'unresolved', displayLabel: path };
    }
    return { status: 'resolved', pageId: note.pageId, title: note.title, markdown: note.markdown };
  };
}

describe('MarkdownReadRenderer — note embeds', () => {
  it('renders a resolved whole-note embed, recursing into the same renderer', () => {
    const resolvePageEmbed = makeResolver({
      'Note B': { pageId: 'b', title: 'Note B', markdown: '# Inside Note B\n\nSome content.' },
    });

    const { container } = render(<MarkdownReadRenderer markdown="See ![[Note B]] for details" resolvers={{ resolvePageEmbed }} />);

    const embed = container.querySelector('.markdown-read-note-embed[data-page-id="b"]');
    expect(embed).not.toBeNull();
    expect(embed?.querySelector('h1')).toHaveTextContent('Inside Note B');
    expect(embed).toHaveTextContent('Some content.');
  });

  it('renders nested embeds two levels deep with no cycle', () => {
    const resolvePageEmbed = makeResolver({
      'Note A': { pageId: 'a', title: 'Note A', markdown: 'A embeds ![[Note B]]' },
      'Note B': { pageId: 'b', title: 'Note B', markdown: 'B embeds ![[Note C]]' },
      'Note C': { pageId: 'c', title: 'Note C', markdown: 'Leaf content C' },
    });

    const { container } = render(<MarkdownReadRenderer markdown="![[Note A]]" resolvers={{ resolvePageEmbed }} />);

    expect(container.querySelector('[data-page-id="a"]')).not.toBeNull();
    expect(container.querySelector('[data-page-id="a"] [data-page-id="b"]')).not.toBeNull();
    expect(container.querySelector('[data-page-id="a"] [data-page-id="b"] [data-page-id="c"]')).not.toBeNull();
    expect(container).toHaveTextContent('Leaf content C');
    expect(container.querySelector('.markdown-read-embed-broken')).toBeNull();
  });

  it('detects a cycle entirely among embedded notes (B embeds C embeds B) and stops recursing', () => {
    const resolvePageEmbed = makeResolver({
      'Note B': { pageId: 'b', title: 'Note B', markdown: 'B embeds ![[Note C]]' },
      'Note C': { pageId: 'c', title: 'Note C', markdown: 'C embeds ![[Note B]]' },
    });

    const { container } = render(<MarkdownReadRenderer markdown="![[Note B]]" resolvers={{ resolvePageEmbed }} />);

    // B renders once, containing C, which detects B already in its own
    // ancestry and renders a broken/circular placeholder instead of
    // recursing into B a second time.
    expect(container.querySelectorAll('[data-page-id="b"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-page-id="c"]')).toHaveLength(1);
    const broken = container.querySelector('.markdown-read-embed-broken');
    expect(broken).not.toBeNull();
    expect(broken).toHaveTextContent('Circular embed');
  });

  function makeChain(length: number): Record<string, FakeNote> {
    const notesByPath: Record<string, FakeNote> = {};
    for (let i = 0; i < length; i++) {
      notesByPath[`Note ${i}`] = {
        pageId: `p${i}`,
        title: `Note ${i}`,
        markdown: i < length - 1 ? `embeds ![[Note ${i + 1}]]` : 'leaf',
      };
    }
    return notesByPath;
  }

  it('stops recursing once the default max embed depth is reached', () => {
    const notesByPath = makeChain(DEFAULT_MAX_EMBED_DEPTH + 3);

    const { container } = render(<MarkdownReadRenderer markdown="![[Note 0]]" resolvers={{ resolvePageEmbed: makeResolver(notesByPath) }} />);

    // Every page up to and including the depth limit renders; beyond that,
    // a depth-limit placeholder replaces further recursion instead of
    // continuing indefinitely.
    for (let i = 0; i < DEFAULT_MAX_EMBED_DEPTH; i++) {
      expect(container.querySelector(`[data-page-id="p${i}"]`), `expected p${i} to render`).not.toBeNull();
    }
    const broken = container.querySelector('.markdown-read-embed-broken');
    expect(broken).not.toBeNull();
    expect(broken).toHaveTextContent('depth limit');
  });

  it('honors an overridden maxEmbedDepth instead of the default', () => {
    const notesByPath = makeChain(5);

    const { container } = render(
      <MarkdownReadRenderer markdown="![[Note 0]]" resolvers={{ resolvePageEmbed: makeResolver(notesByPath), maxEmbedDepth: 2 }} />
    );

    expect(container.querySelector('[data-page-id="p0"]')).not.toBeNull();
    expect(container.querySelector('[data-page-id="p1"]')).not.toBeNull();
    expect(container.querySelector('[data-page-id="p2"]')).toBeNull();
    expect(container.querySelector('.markdown-read-embed-broken')).toHaveTextContent('depth limit');
  });

  it('renders a broken-embed placeholder for an unresolved note target', () => {
    const { container } = render(
      <MarkdownReadRenderer markdown="![[Missing Note]]" resolvers={{ resolvePageEmbed: makeResolver({}) }} />
    );

    const broken = container.querySelector('.markdown-read-embed-broken');
    expect(broken).not.toBeNull();
    expect(broken).toHaveTextContent('Missing Note');
  });

  it('renders a broken-embed placeholder for an ambiguous note target', () => {
    const resolvePageEmbed = (): PageEmbedResolution => ({ status: 'ambiguous', displayLabel: 'Shared Name' });
    const { container } = render(<MarkdownReadRenderer markdown="![[Shared Name]]" resolvers={{ resolvePageEmbed }} />);

    expect(container.querySelector('.markdown-read-embed-broken')).toHaveTextContent('Shared Name');
  });

  it('renders a broken-embed placeholder when no resolvePageEmbed is injected at all', () => {
    const { container } = render(<MarkdownReadRenderer markdown="![[Some Note]]" />);
    expect(container.querySelector('.markdown-read-embed-broken')).toHaveTextContent('Some Note');
  });
});
