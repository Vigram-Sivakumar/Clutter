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
 * Continuous container styling for fenced code blocks — background, left/
 * right borders, and rounded top/bottom corners spanning every physical
 * line a `FencedCode` node owns. Purely presentational: a `Decoration.line`
 * class, no document mutation, no dependency on selection/engagement —
 * the same relationship `blockquoteLineDecoration.ts` has to
 * `blockquoteMarkerDecoration.ts` (marker text vs. line presentation are
 * independent decoration sources over disjoint concerns).
 *
 * **One flat class, not a begin/middle/end triple** — deliberately
 * reusing `blockquoteLineDecoration.ts`'s own corner-rounding technique
 * rather than inventing a new one: every owned line gets the exact same
 * `cm-code-block-line` class (see `MarkdownEditor.css`'s own rule for the
 * full explanation), and CSS sibling combinators alone
 * (`.cm-code-block-line + .cm-code-block-line` / `:has(+ ...)`) derive
 * "is this the first/last line of a contiguous run" from plain DOM
 * adjacency — `.cm-content` already renders `.cm-line`s as flat, direct
 * siblings in document order, the same fact blockquote's own rounding
 * (and the table-row rounding it cites) already relies on. No JS-side
 * begin/middle/end computation, no new class per position.
 *
 * Line-ownership algorithm is a direct reuse of
 * `blockquoteLineDecoration.ts`'s own approach: iterate every visible
 * physical line, probe its first non-whitespace character (or the line's
 * own start, for a genuinely blank line), and ask the syntax tree which
 * `FencedCode` ancestor (if any) owns that position — never walking the
 * `FencedCode` node's own `[from, to)` range directly. This is what
 * correctly includes the code block's own *blank* interior lines (an
 * empty line inside a multi-line fenced body still belongs to the
 * block and must keep the container unbroken there) while correctly
 * excluding lines genuinely outside it.
 */
function fencedCodeLineMark(): Decoration {
  return Decoration.line({ attributes: { class: 'cm-code-block-line' } });
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
        if (nearestFencedCode(view.state, probePos)) {
          builder.add(line.from, line.from, fencedCodeLineMark());
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
