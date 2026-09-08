// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ResolveWikiLink, WikiLinkResolution } from '../editor/codemirror/wikilink/wikiLinkResolution';
import { MarkdownReadRenderer } from './MarkdownReadRenderer';

describe('MarkdownReadRenderer', () => {
  it('renders a paragraph as a <p> element', () => {
    const { container } = render(<MarkdownReadRenderer markdown="Ship the release notes" />);
    const p = container.querySelector('p.markdown-read-paragraph');
    expect(p).not.toBeNull();
    expect(p).toHaveTextContent('Ship the release notes');
  });

  it('renders each ATX heading level as its matching hN element, stripping the marker', () => {
    const markdown = ['# One', '## Two', '### Three', '#### Four', '##### Five', '###### Six'].join('\n\n');
    const { container } = render(<MarkdownReadRenderer markdown={markdown} />);

    for (const [level, text] of [
      ['h1', 'One'],
      ['h2', 'Two'],
      ['h3', 'Three'],
      ['h4', 'Four'],
      ['h5', 'Five'],
      ['h6', 'Six'],
    ] as const) {
      const el = container.querySelector(level);
      expect(el, `expected ${level}`).not.toBeNull();
      expect(el).toHaveTextContent(text);
    }
  });

  it('renders inline formatting inside a heading', () => {
    const { container } = render(<MarkdownReadRenderer markdown="# Hello **World**" />);
    const h1 = container.querySelector('h1');
    expect(h1).toHaveTextContent('Hello World');
    expect(h1?.querySelector('strong')).toHaveTextContent('World');
  });

  it('renders a blockquote, recursing into its block content', () => {
    const { container } = render(<MarkdownReadRenderer markdown={'> Quoted text\n> more of it'} />);
    const blockquote = container.querySelector('blockquote.markdown-read-blockquote');
    expect(blockquote).not.toBeNull();
    expect(blockquote).toHaveTextContent('Quoted text');
  });

  it('renders a heading nested inside a blockquote as a real hN element within it — matching the actual grammar (ATXHeading1 genuinely nests inside Blockquote) and standard Markdown rendering', () => {
    const { container } = render(<MarkdownReadRenderer markdown="> # Real heading in blockquote" />);
    const blockquote = container.querySelector('blockquote.markdown-read-blockquote');
    const heading = blockquote?.querySelector('h1');
    expect(heading).not.toBeNull();
    expect(heading).toHaveTextContent('Real heading in blockquote');
  });

  it('renders a fenced code block with its language and body', () => {
    const { container } = render(<MarkdownReadRenderer markdown={'```js\nconst x = 1;\n```'} />);
    const code = container.querySelector('pre.markdown-read-code-block code');
    expect(code).not.toBeNull();
    expect(code).toHaveAttribute('data-language', 'js');
    expect(code).toHaveTextContent('const x = 1;');
  });

  it('does not treat a heading-like line inside a fenced code block as a heading', () => {
    const { container } = render(<MarkdownReadRenderer markdown={'```\n# not a heading\n```'} />);
    expect(container.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull();
    expect(container.querySelector('code')).toHaveTextContent('# not a heading');
  });

  it('renders a horizontal rule as an <hr>', () => {
    const { container } = render(<MarkdownReadRenderer markdown={'Above\n\n---\n\nBelow'} />);
    expect(container.querySelector('hr.markdown-read-hr')).not.toBeNull();
  });

  it('renders an unsupported block type (e.g. a list) as visible raw text rather than dropping it', () => {
    const { container } = render(<MarkdownReadRenderer markdown={'- one\n- two'} />);
    const unsupported = container.querySelector('.markdown-read-unsupported');
    expect(unsupported).not.toBeNull();
    expect(unsupported).toHaveTextContent('one');
    expect(unsupported).toHaveTextContent('two');
  });

  it('resolves WikiLinks through the injected resolver, matching the editor/compact-renderer contract', () => {
    const resolution: WikiLinkResolution = { status: 'resolved', displayLabel: 'Project Alpha', activate: vi.fn() };
    const resolveWikiLink: ResolveWikiLink = vi.fn().mockReturnValue(resolution);

    const { container } = render(
      <MarkdownReadRenderer markdown="See [[Project Alpha]] for details" resolvers={{ resolveWikiLink }} />
    );

    const link = container.querySelector('a.markdown-read-wikilink');
    expect(link).not.toBeNull();
    expect(link).toHaveTextContent('Project Alpha');
    expect(link).toHaveAttribute('data-wikilink-status', 'resolved');
    expect(resolveWikiLink).toHaveBeenCalledWith('Project Alpha', null);
  });

  it('falls back to the shared fallback resolution when no resolver is injected', () => {
    const { container } = render(<MarkdownReadRenderer markdown="[[Some Note]]" />);
    const link = container.querySelector('a.markdown-read-wikilink');
    expect(link).toHaveAttribute('data-wikilink-status', 'unresolved');
    expect(link).toHaveTextContent('Some Note');
  });

  it('renders multiple top-level blocks in document order', () => {
    const { container } = render(<MarkdownReadRenderer markdown={'# Title\n\nFirst paragraph.\n\nSecond paragraph.'} />);
    const blocks = container.querySelectorAll('.markdown-read > *');
    expect(blocks).toHaveLength(3);
    expect(blocks[0]?.tagName).toBe('H1');
    expect(blocks[1]).toHaveTextContent('First paragraph.');
    expect(blocks[2]).toHaveTextContent('Second paragraph.');
  });
});
