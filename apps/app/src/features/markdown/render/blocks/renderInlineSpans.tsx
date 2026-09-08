import type { ReactNode } from 'react';

import { formatDateDisplay } from '@shared/helpers/time/dateDisplay';
import { isValidCalendarDate } from '@shared/helpers/time/helpers/isValidCalendarDate';

import type { ResolveEmbedImage } from '../../editor/codemirror/embed/embedImageResolution';
import type { ResolveEmbedPdf } from '../../editor/codemirror/pdf/embedPdfResolution';
import { fallbackTagResolution, type ResolveTag } from '../../editor/codemirror/tag/tagResolution';
import { fallbackWikiLinkResolution, type ResolveWikiLink } from '../../editor/codemirror/wikilink/wikiLinkResolution';
import type { InlineSpan } from '../inlineSpan';
import { ReadEmbed } from './ReadEmbed';

/**
 * Same resolver contracts `renderCompactMarkdown`/`MarkdownEditor` inject
 * — reused unchanged, not a second resolver shape invented for this
 * surface (see `CompactMarkdownResolvers`'s own doc comment for why).
 */
export interface MarkdownReadResolvers {
  readonly resolveWikiLink?: ResolveWikiLink;
  readonly resolveTag?: ResolveTag;
  readonly resolveEmbedImage?: ResolveEmbedImage;
  readonly resolveEmbedPdf?: ResolveEmbedPdf;
}

function renderDateSpan(isoDate: string, key: string): ReactNode {
  const valid = isValidCalendarDate(isoDate);
  const label = valid ? formatDateDisplay(isoDate, 'compact') : isoDate;

  return (
    <span key={key} className="markdown-read-date" data-date-status={valid ? 'valid' : 'invalid'}>
      <span className="markdown-read-date-prefix">@</span>
      {label}
    </span>
  );
}

function renderWikiLinkSpan(
  path: string,
  alias: string | null,
  resolveWikiLink: ResolveWikiLink | undefined,
  key: string
): ReactNode {
  const resolution = resolveWikiLink ? resolveWikiLink(path, alias) : fallbackWikiLinkResolution(path);

  return (
    <a
      key={key}
      href="#"
      className="markdown-read-wikilink"
      data-wikilink-status={resolution.status}
      onClick={(event) => {
        event.preventDefault();
        resolution.activate();
      }}
    >
      {resolution.displayLabel}
    </a>
  );
}

function renderTagSpan(name: string, resolveTag: ResolveTag | undefined, key: string): ReactNode {
  const resolution = resolveTag ? resolveTag(name) : fallbackTagResolution(name);

  return (
    <a
      key={key}
      href="#"
      className="markdown-read-tag"
      data-tag-status={resolution.status}
      onClick={(event) => {
        event.preventDefault();
        resolution.activate();
      }}
    >
      <span className="markdown-read-tag-prefix">#</span>
      {resolution.displayLabel}
    </a>
  );
}

function renderOneSpan(span: InlineSpan, resolvers: MarkdownReadResolvers, key: string): ReactNode {
  switch (span.kind) {
    case 'text':
      return span.value;
    case 'bold':
      return <strong key={key}>{span.value}</strong>;
    case 'italic':
      return <em key={key}>{span.value}</em>;
    case 'strikethrough':
      return <s key={key}>{span.value}</s>;
    case 'highlight':
      return (
        <mark key={key} className="markdown-read-highlight">
          {span.value}
        </mark>
      );
    case 'code':
      return (
        <code key={key} className="markdown-read-code">
          {span.value}
        </code>
      );
    case 'wikilink':
      return renderWikiLinkSpan(span.path, span.alias, resolvers.resolveWikiLink, key);
    case 'tag':
      return renderTagSpan(span.name, resolvers.resolveTag, key);
    case 'date':
      return renderDateSpan(span.isoDate, key);
    case 'link':
      return span.label;
    case 'image':
      return span.alt;
    case 'embed':
      return (
        <ReadEmbed
          key={key}
          path={span.path}
          alias={span.alias}
          resolveEmbedImage={resolvers.resolveEmbedImage}
          resolveEmbedPdf={resolvers.resolveEmbedPdf}
        />
      );
  }
}

/**
 * Renders a block's already-tokenized inline content. `keyPrefix` scopes
 * React keys to the owning block, since spans are re-tokenized per block
 * rather than once for the whole document (see `renderBlocks.tsx`).
 */
export function renderInlineSpans(spans: readonly InlineSpan[], resolvers: MarkdownReadResolvers, keyPrefix: string): ReactNode[] {
  return spans.map((span, index) => renderOneSpan(span, resolvers, `${keyPrefix}-${index}`));
}
