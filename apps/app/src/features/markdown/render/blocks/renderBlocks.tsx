import type { SyntaxNode } from '@lezer/common';
import type { ReactNode } from 'react';

import { tokenizeInline } from '../inlineSpan';
import { renderInlineSpans, type MarkdownReadResolvers } from './renderInlineSpans';

const HEADING_NODE_LEVEL: Readonly<Record<string, number>> = {
  ATXHeading1: 1,
  ATXHeading2: 2,
  ATXHeading3: 3,
  ATXHeading4: 4,
  ATXHeading5: 5,
  ATXHeading6: 6,
};

const HORIZONTAL_RULE_NODE_NAMES = new Set([
  'HorizontalRule',
  'DoubleHorizontalRule',
  'DottedHorizontalRule',
  'LabeledHorizontalRule',
  'WavyHorizontalRule',
]);

function isMarkNode(node: SyntaxNode): boolean {
  return node.type.name.endsWith('Mark');
}

/**
 * Skips a heading's leading `HeaderMark` and the whitespace immediately
 * following it, so the tokenized inline content starts at the heading's
 * actual text rather than including the `#`/leading space as literal
 * text — `tokenizeInline` itself deliberately doesn't do this stripping
 * (compact rendering's own documented behavior relies on it not doing
 * so), so each caller that needs it does it locally.
 */
function headingContentStart(node: SyntaxNode, text: string): number {
  const mark = node.firstChild;
  let start = mark && mark.type.name === 'HeaderMark' ? mark.to : node.from;
  while (start < node.to && /\s/.test(text.charAt(start))) {
    start += 1;
  }
  return start;
}

function renderHeading(node: SyntaxNode, level: number, text: string, resolvers: MarkdownReadResolvers, key: string): ReactNode {
  const spans = tokenizeInline(node, text, headingContentStart(node, text));
  const content = renderInlineSpans(spans, resolvers, key);
  const Tag = (`h${level}` as const) as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  return (
    <Tag key={key} className="markdown-read-heading">
      {content}
    </Tag>
  );
}

function renderParagraph(node: SyntaxNode, text: string, resolvers: MarkdownReadResolvers, key: string): ReactNode {
  const spans = tokenizeInline(node, text);
  return (
    <p key={key} className="markdown-read-paragraph">
      {renderInlineSpans(spans, resolvers, key)}
    </p>
  );
}

function renderBlockquote(node: SyntaxNode, text: string, resolvers: MarkdownReadResolvers, key: string): ReactNode {
  return (
    <blockquote key={key} className="markdown-read-blockquote">
      {renderBlockChildren(node, text, resolvers, key)}
    </blockquote>
  );
}

function renderFencedCode(node: SyntaxNode, text: string, key: string): ReactNode {
  let info = '';
  let body = '';

  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.type.name === 'CodeInfo') {
      info = text.slice(child.from, child.to);
    } else if (child.type.name === 'CodeText') {
      body = text.slice(child.from, child.to);
    }
  }

  return (
    <pre key={key} className="markdown-read-code-block">
      <code data-language={info || undefined}>{body}</code>
    </pre>
  );
}

/**
 * A block type this renderer doesn't yet have dedicated presentation for
 * (lists, tables, task lists — deliberately deferred, see
 * `docs/implementation-rules.md`-governed scoping for `MarkdownReadRenderer`).
 * Rendered as visible raw text rather than silently dropped, so nothing
 * a page actually contains disappears from Read Mode/an embed.
 */
function renderUnsupportedBlock(node: SyntaxNode, text: string, key: string): ReactNode {
  return (
    <div key={key} className="markdown-read-unsupported" data-block-type={node.type.name}>
      {text.slice(node.from, node.to)}
    </div>
  );
}

/**
 * Renders every direct block child of `parent` (a `Document` node, or a
 * `Blockquote` node when recursing) — skipping structural mark children
 * (e.g. a blockquote's per-line `QuoteMark`), dispatching each remaining
 * child to its block renderer.
 */
export function renderBlockChildren(
  parent: SyntaxNode,
  text: string,
  resolvers: MarkdownReadResolvers,
  keyPrefix: string
): ReactNode[] {
  const blocks: ReactNode[] = [];
  let index = 0;

  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (isMarkNode(child)) {
      continue;
    }

    const key = `${keyPrefix}-${index}`;
    index += 1;

    const headingLevel = HEADING_NODE_LEVEL[child.type.name];
    if (headingLevel) {
      blocks.push(renderHeading(child, headingLevel, text, resolvers, key));
      continue;
    }

    if (child.type.name === 'Paragraph') {
      blocks.push(renderParagraph(child, text, resolvers, key));
      continue;
    }

    if (child.type.name === 'Blockquote') {
      blocks.push(renderBlockquote(child, text, resolvers, key));
      continue;
    }

    if (child.type.name === 'FencedCode') {
      blocks.push(renderFencedCode(child, text, key));
      continue;
    }

    if (HORIZONTAL_RULE_NODE_NAMES.has(child.type.name)) {
      blocks.push(<hr key={key} className="markdown-read-hr" />);
      continue;
    }

    blocks.push(renderUnsupportedBlock(child, text, key));
  }

  return blocks;
}
