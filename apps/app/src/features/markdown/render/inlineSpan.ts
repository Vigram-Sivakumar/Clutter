import type { SyntaxNode } from '@lezer/common';

import { scanDate } from '../editor/codemirror/date/dateScanner';
import { scanEmbed } from '../editor/codemirror/embed/embedScanner';
import { scanTag } from '../editor/codemirror/tag/tagScanner';
import { scanWikiLink } from '../editor/codemirror/wikilink/wikiLinkScanner';

/**
 * Inline span vocabulary for a read-only Markdown rendering surface —
 * currently only the compact/sidebar renderer (`tokenizeCompactMarkdown`/
 * `renderCompactMarkdown`) — kept as its own module (rather than inlined
 * into that renderer) so a second CM6-independent rendering surface,
 * should one ever exist, shares this exact vocabulary instead of
 * independently deciding what counts as bold/italic/strikethrough/code/
 * highlight/WikiLink/Tag/Date/link/image.
 */
export type InlineSpan =
  | { readonly kind: 'text'; readonly value: string }
  | { readonly kind: 'bold' | 'italic' | 'strikethrough' | 'code' | 'highlight'; readonly value: string }
  | { readonly kind: 'wikilink'; readonly path: string; readonly alias: string | null }
  | { readonly kind: 'tag'; readonly name: string }
  | { readonly kind: 'date'; readonly isoDate: string }
  | { readonly kind: 'link'; readonly label: string }
  | { readonly kind: 'image'; readonly alt: string }
  | { readonly kind: 'embed'; readonly path: string; readonly alias: string | null };

/**
 * Emphasis-family node kinds that flatten to a single span: each always
 * parses with exactly two same-named mark children bracketing its content
 * (confirmed against the installed `@lezer/markdown` by
 * `emphasisMarkerDecoration.ts`/`strikethroughMarkerDecoration.ts`/
 * `inlineCodeMarkerDecoration.ts`, whose doc comments this reuses rather
 * than re-deriving). A nested construct between the marks (`***bold
 * italic***`, `**[[Note]]**`) is deliberately not recursed into — it
 * stays as literal raw text inside the outer span's `value`, one flat
 * style per span.
 */
export const EMPHASIS_NODES: Readonly<
  Record<string, { kind: 'bold' | 'italic' | 'strikethrough' | 'code' | 'highlight'; markName: string }>
> = {
  Emphasis: { kind: 'italic', markName: 'EmphasisMark' },
  StrongEmphasis: { kind: 'bold', markName: 'EmphasisMark' },
  Strikethrough: { kind: 'strikethrough', markName: 'StrikethroughMark' },
  InlineCode: { kind: 'code', markName: 'CodeMark' },
  Highlight: { kind: 'highlight', markName: 'HighlightMark' },
};

export function markedInnerText(node: SyntaxNode, text: string, markName: string): string {
  const open = node.firstChild;
  const close = node.lastChild;
  if (!open || open.name !== markName || !close || close.name !== markName || open === close) {
    // Not the guaranteed two-mark shape the doc comment above documents —
    // defensively fall back to the node's full raw text rather than
    // mis-slicing marks into the value.
    return text.slice(node.from, node.to);
  }
  return text.slice(open.to, close.from);
}

/**
 * `WikiLink`/`Tag`/`Date` nodes are each registered as a single flat
 * element with no children (`cx.elt(name, pos, pos + match.end)` — see
 * `wikiLinkSyntax.ts`/`tagSyntax.ts`/`dateSyntax.ts`), so their structured
 * fields (path/alias, name, isoDate) aren't recoverable from the tree
 * shape at all — re-running each construct's own pure scanner at the
 * node's start offset is how the Lezer glue itself produces these nodes
 * in the first place, so it's the correct, already-proven way to recover
 * the same fields here, not a parallel re-implementation.
 */
export function readWikiLink(node: SyntaxNode, text: string): InlineSpan {
  const match = scanWikiLink(text, node.from);
  if (!match) {
    return { kind: 'text', value: text.slice(node.from, node.to) };
  }
  return { kind: 'wikilink', path: match.path, alias: match.alias };
}

export function readTag(node: SyntaxNode, text: string): InlineSpan {
  const match = scanTag(text, node.from);
  if (!match) {
    return { kind: 'text', value: text.slice(node.from, node.to) };
  }
  return { kind: 'tag', name: match.name };
}

export function readDate(node: SyntaxNode, text: string): InlineSpan {
  const match = scanDate(text, node.from);
  if (!match) {
    return { kind: 'text', value: text.slice(node.from, node.to) };
  }
  return { kind: 'date', isoDate: match.isoDate };
}

/**
 * `Link`/`Image` both parse as a flat run of `LinkMark` tokens around an
 * unnamed label range plus a `URL` child (confirmed empirically against
 * the installed `@lezer/markdown@1.7.2`: `[text](url)` → `LinkMark"["`,
 * `LinkMark"]"`, `LinkMark"("`, `URL`, `LinkMark")"`; `![alt](url)` is the
 * same shape with `LinkMark"!["` as the opening mark) — the label itself
 * has no node of its own, so it's recovered the same way `markedInnerText`
 * recovers emphasis content: the text between the first two `LinkMark`
 * children.
 */
export function bracketedLabelText(node: SyntaxNode, text: string): string | null {
  const marks: SyntaxNode[] = [];
  for (let child = node.firstChild; child && marks.length < 2; child = child.nextSibling) {
    if (child.name === 'LinkMark') {
      marks.push(child);
    }
  }
  const [open, close] = marks;
  if (!open || !close) {
    return null;
  }
  return text.slice(open.to, close.from);
}

export function readLink(node: SyntaxNode, text: string): InlineSpan {
  const label = bracketedLabelText(node, text);
  return label === null ? { kind: 'text', value: text.slice(node.from, node.to) } : { kind: 'link', label };
}

export function readImage(node: SyntaxNode, text: string): InlineSpan {
  const alt = bracketedLabelText(node, text);
  return alt === null ? { kind: 'text', value: text.slice(node.from, node.to) } : { kind: 'image', alt };
}

/**
 * `Embed` is a single flat element with no children — same shape as
 * `WikiLink` (it delegates entirely to `scanWikiLink` underneath, offset
 * by the leading `!`; see `embedScanner.ts`'s own doc comment). Re-running
 * `scanEmbed` at the node's start offset is the same "recover structured
 * fields via the construct's own pure scanner" pattern `readWikiLink`
 * already establishes.
 */
export function readEmbed(node: SyntaxNode, text: string): InlineSpan {
  const match = scanEmbed(text, node.from);
  if (!match) {
    return { kind: 'text', value: text.slice(node.from, node.to) };
  }
  return { kind: 'embed', path: match.path, alias: match.alias };
}

/**
 * Flattens `node`'s inline content to a marker-free sequence of
 * `InlineSpan`s. Shared by `tokenizeCompactMarkdown` (called with
 * `tree.topNode`, spanning an entire compact-rendered string) and the
 * block-aware renderer (called once per block node — a `Paragraph`,
 * a heading's content, etc. — so each block's inline formatting is
 * tokenized independently of its surrounding block structure).
 *
 * Any node of a recognized kind (emphasis family, WikiLink, Tag, Date,
 * Link, Image, Autolink, bare URL) is emitted as its own span and not
 * recursed into; everything else is recursed through so its recognized
 * descendants are still found, wherever nested. Text between/around
 * recognized nodes — including block-structural marks like a heading's
 * `HeaderMark` or a blockquote's `QuoteMark`, when `node` itself is one
 * of those container nodes — is captured verbatim as `'text'` spans:
 * stripping those is each caller's own responsibility (e.g. by passing
 * `from` past the mark), not this function's, so compact rendering's
 * existing, deliberate "leave block markers as literal text" behavior
 * is unaffected by callers that do need them stripped.
 *
 * `from` overrides where the first span's leading edge is measured from
 * (defaults to `node.from`) — used to skip a leading structural mark
 * without changing this function's own mark-handling behavior.
 */
export function tokenizeInline(node: SyntaxNode, text: string, from?: number): InlineSpan[] {
  const spans: InlineSpan[] = [];
  let cursor = from ?? node.from;

  function pushText(from: number, to: number): void {
    if (to > from) {
      spans.push({ kind: 'text', value: text.slice(from, to) });
    }
  }

  function visit(n: SyntaxNode): void {
    const emphasis = EMPHASIS_NODES[n.name];
    if (emphasis) {
      pushText(cursor, n.from);
      spans.push({ kind: emphasis.kind, value: markedInnerText(n, text, emphasis.markName) });
      cursor = n.to;
      return;
    }

    if (n.name === 'WikiLink' || n.name === 'Tag' || n.name === 'Date') {
      pushText(cursor, n.from);
      spans.push(n.name === 'WikiLink' ? readWikiLink(n, text) : n.name === 'Tag' ? readTag(n, text) : readDate(n, text));
      cursor = n.to;
      return;
    }

    if (n.name === 'Link' || n.name === 'Image') {
      pushText(cursor, n.from);
      spans.push(n.name === 'Link' ? readLink(n, text) : readImage(n, text));
      cursor = n.to;
      return;
    }

    if (n.name === 'Embed') {
      pushText(cursor, n.from);
      spans.push(readEmbed(n, text));
      cursor = n.to;
      return;
    }

    if (n.name === 'Autolink') {
      pushText(cursor, n.from);
      spans.push({ kind: 'link', label: markedInnerText(n, text, 'LinkMark') });
      cursor = n.to;
      return;
    }

    if (n.name === 'URL') {
      pushText(cursor, n.from);
      spans.push({ kind: 'link', label: text.slice(n.from, n.to) });
      cursor = n.to;
      return;
    }

    for (let child = n.firstChild; child; child = child.nextSibling) {
      visit(child);
    }
  }

  visit(node);
  pushText(cursor, node.to);

  return spans;
}
