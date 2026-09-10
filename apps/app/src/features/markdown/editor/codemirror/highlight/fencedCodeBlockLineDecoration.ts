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
 * The visual code-block *card* — background, left/right borders, and
 * rounded top/bottom corners — via `Decoration.line` classes on `.cm-line`,
 * the same native mechanism `blockquoteLineDecoration.ts`/`tableDecoration.ts`/
 * `horizontalRuleDecoration.ts` already use for their own line-level
 * presentation (confirmed as a legitimate, precedented Clutter pattern by
 * this feature's own architecture investigation — decorating `.cm-line` was
 * never the problem; `margin` specifically was).
 *
 * **Deliberately reinstated 2026-09-10, narrower than its own first
 * version: this file owns the visual card only, never structural
 * grouping.** `highlight/fencedCodeBlockWrapper.ts`'s `EditorView.blockWrappers`
 * already gives every `FencedCode` node its own real `<div class="cm-code-block">`
 * parent, so two independent, back-to-back blocks (no blank line between
 * them) are already two separate DOM subtrees *before* this file runs —
 * the `--first`/`--last` computation below only needs to place the correct
 * border/radius on the correct line *within* an already-correctly-grouped
 * block, not additionally prevent two different blocks' lines from reading
 * as one merged run (an earlier version of this file, predating the
 * wrapper, had to solve that problem itself; it no longer needs to).
 *
 * Every owned line still gets the shared `cm-code-block-line` class
 * (background, left/right border, horizontal `padding-inline` — safe per
 * `.cm-hr-line`'s own existing vertical-padding precedent, and confirmed
 * directly this session: `padding` does not reproduce the `margin`
 * cursor/navigation corruption on either `.cm-line` or `.cm-code-block`).
 * The line containing the owning node's own `.from` additionally gets
 * `cm-code-block-line--first` (top border + top corners); the line
 * containing the node's own `.to` gets `cm-code-block-line--last` (bottom
 * border + bottom corners). A single-line-body block's one line carries
 * both modifiers at once, which composes correctly since the two rules
 * touch disjoint edges.
 *
 * **No `margin` anywhere in this file** — the external gap between
 * adjacent cards is `fencedCodeBlockWrapper.ts`'s `.cm-code-block`'s own
 * `padding-block`, never a property here.
 *
 * Line-ownership algorithm (which lines belong to a `FencedCode` at all) is
 * a direct reuse of `blockquoteLineDecoration.ts`'s own approach: iterate
 * every visible physical line, probe its first non-whitespace character
 * (or the line's own start, for a genuinely blank line), and ask the
 * syntax tree which `FencedCode` ancestor (if any) owns that position —
 * never walking the node's own range directly for *membership*. This
 * correctly includes the block's own blank interior lines while correctly
 * excluding lines genuinely outside it; only the first/last *modifier*
 * classes are derived from the owning node's own boundary positions.
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
