import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder, type EditorState, type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type PluginValue,
  type ViewUpdate,
} from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

/**
 * Per-block container styling for fenced code blocks — background, left/
 * right borders, and rounded top/bottom corners spanning every physical
 * line a `FencedCode` node owns. Purely presentational: a `Decoration.line`
 * class, no document mutation, no dependency on selection/engagement —
 * the same relationship `blockquoteLineDecoration.ts` has to
 * `blockquoteMarkerDecoration.ts` (marker text vs. line presentation are
 * independent decoration sources over disjoint concerns).
 *
 * **Superseded design note**: an earlier version of this file used one
 * flat `cm-code-block-line` class plus pure CSS sibling adjacency
 * (`.cm-code-block-line + .cm-code-block-line` / `:has(+ ...)`) to derive
 * "first/last line of a run" — the same technique `blockquoteLineDecoration.ts`
 * still correctly uses for blockquote. That technique is only correct when
 * DOM adjacency between two same-class lines *always* means "same logical
 * construct" — true for blockquote (an adjacent `>` line is, by
 * construction, always a continuation of the same quote), but **false**
 * for fenced code: two independent, back-to-back `FencedCode` blocks with
 * no blank line between them (a real, legal Markdown document — CommonMark
 * requires no separator between a closing fence and a following opening
 * fence) produce two adjacent `.cm-code-block-line` elements that are
 * *not* the same block, and the adjacency rule incorrectly rounded/joined
 * them into one continuous container. Confirmed directly, not assumed:
 * reproduced with three back-to-back fenced blocks and observed exactly
 * one merged container instead of three independent ones.
 *
 * **Fix: per-node first/last-line identity, computed from each `FencedCode`
 * node's own `[from, to)` range** — not DOM adjacency, not a generic
 * "does this line's class match its neighbor's" check. Every owned line
 * still gets the shared `cm-code-block-line` class (background, left/right
 * border); the line containing the node's own `.from` additionally gets
 * `cm-code-block-line--first` (top border + top corners), and the line
 * containing the node's own `.to` additionally gets `cm-code-block-line--last`
 * (bottom border + bottom corners) — see `MarkdownEditor.css`'s own rules.
 * A single-line-body block's one line gets both modifiers at once, which
 * composes correctly (full border + full radius) since the two modifiers'
 * CSS rules touch disjoint edges (top-only vs. bottom-only) — no special
 * casing needed for that overlap. Two back-to-back blocks now each carry
 * their own `--first`/`--last` pair regardless of what class their
 * immediate DOM neighbor happens to carry, which is what makes them
 * render as two independent cards even with zero blank lines between them.
 *
 * Line-ownership algorithm (which lines belong to a `FencedCode` at all)
 * is unchanged from the superseded version, and still a direct reuse of
 * `blockquoteLineDecoration.ts`'s own approach: iterate every visible
 * physical line, probe its first non-whitespace character (or the line's
 * own start, for a genuinely blank line), and ask the syntax tree which
 * `FencedCode` ancestor (if any) owns that position — never walking the
 * node's own range directly for *membership*. This is what correctly
 * includes the block's own blank interior lines while correctly excluding
 * lines genuinely outside it; only the first/last *modifier* classes are
 * newly derived from the owning node's own boundary positions.
 */
function fencedCodeLineMark(isFirst: boolean, isLast: boolean): Decoration {
  const classes = ['cm-code-block-line'];
  if (isFirst) {
    classes.push('cm-code-block-line--first');
  }
  if (isLast) {
    classes.push('cm-code-block-line--last');
  }
  return Decoration.line({ attributes: { class: classes.join(' ') } });
}

function firstNonWhitespaceOffset(text: string): number {
  return text.length - text.trimStart().length;
}

function nearestFencedCode(state: EditorState, probePos: number): SyntaxNode | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(probePos, 1);
  for (; node; node = node.parent) {
    if (node.name === 'FencedCode') {
      return node;
    }
  }
  return null;
}

function buildFencedCodeLineDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const seenLines = new Set<number>();

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = view.state.doc.lineAt(pos);
      if (!seenLines.has(line.from)) {
        seenLines.add(line.from);

        const probePos = line.from + firstNonWhitespaceOffset(line.text);
        const owner = nearestFencedCode(view.state, probePos);
        if (owner) {
          const isFirst = line.from <= owner.from && owner.from <= line.to;
          const isLast = line.from <= owner.to && owner.to <= line.to;
          builder.add(line.from, line.from, fencedCodeLineMark(isFirst, isLast));
        }
      }

      pos = line.to + 1;
    }
  }

  return builder.finish();
}

interface FencedCodeBlockLinePlugin extends PluginValue {
  decorations: DecorationSet;
}

export function fencedCodeBlockLineDecoration(): Extension {
  return ViewPlugin.fromClass<FencedCodeBlockLinePlugin>(
    class implements FencedCodeBlockLinePlugin {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildFencedCodeLineDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildFencedCodeLineDecorations(update.view);
        }
      }
    },
    {
      decorations: (p) => p.decorations,
    }
  );
}
