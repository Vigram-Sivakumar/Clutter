import { syntaxTree } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type PluginValue,
  type ViewUpdate,
} from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';

import { resolveFormatterParser } from '../fencedCode/codeFormatting';
import { FencedCodeFormatButtonWidget } from '../fencedCode/FencedCodeFormatButtonWidget';

/**
 * Inserts a Format control next to the existing Copy control — same
 * `Decoration.widget({widget, side: 1}).range(pos)` mechanism, same
 * insertion point (`CodeInfo.to`, or the opening `CodeMark`'s own end when
 * there's no info string), same tree-walk shape as
 * `fencedCodeCopyButtonDecoration.ts`. Deliberately a sibling file, not a
 * second widget folded into that one — matches this codebase's own
 * established convention of one decoration file per fenced-code concern
 * (language label, marker, line, wrapper, copy button all already
 * separate), and keeps Copy's own already-tested file completely
 * unmodified.
 *
 * The one real difference from Copy: **only emitted when
 * `codeFormatting.ts`'s `resolveFormatterParser` recognizes the block's
 * language** (currently JavaScript/TypeScript/JSON/CSS/HTML — Python and
 * anything unrecognized get no button at all, per the explicit "hidden
 * for unsupported languages" requirement — not a disabled button, no
 * button). CSS positions Format immediately to the left of Copy
 * (`MarkdownEditor.css`); the padding-reservation rule that keeps engaged
 * raw text from rendering underneath the button row already widens
 * itself via `:has()` when a second control is present, no new selector
 * needed there.
 */
function nearestFencedCodeFrom(view: EditorView, fencedCodeFrom: number): SyntaxNode | null {
  let node: SyntaxNode | null = syntaxTree(view.state).resolveInner(fencedCodeFrom + 1, 1);
  for (; node; node = node.parent) {
    if (node.name === 'FencedCode' && node.from === fencedCodeFrom) {
      return node;
    }
  }
  return null;
}

function buildDecorations(view: EditorView): DecorationSet {
  const ranges: { pos: number; widget: FencedCodeFormatButtonWidget }[] = [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== 'FencedCode') {
          return;
        }

        const openMark = node.node.firstChild;
        if (!openMark || openMark.name !== 'CodeMark') {
          return;
        }

        const codeInfo = node.node.getChild('CodeInfo');
        const rawInfo = codeInfo ? view.state.sliceDoc(codeInfo.from, codeInfo.to) : '';
        const parserName = resolveFormatterParser(rawInfo);
        if (!parserName) {
          return;
        }

        const pos = codeInfo ? codeInfo.to : openMark.to;
        const fencedCodeFrom = node.from;

        ranges.push({
          pos,
          widget: new FencedCodeFormatButtonWidget(fencedCodeFrom, parserName, view, () => {
            const codeText = nearestFencedCodeFrom(view, fencedCodeFrom)?.getChild('CodeText');
            return codeText ? { from: codeText.from, to: codeText.to } : null;
          }),
        });
      },
    });
  }

  return Decoration.set(
    ranges
      .map(({ pos, widget }) => Decoration.widget({ widget, side: 1 }).range(pos))
      .sort((a, b) => a.from - b.from)
  );
}

interface FencedCodeFormatButtonPlugin extends PluginValue {
  decorations: DecorationSet;
}

export function fencedCodeFormatButtonDecoration(): Extension {
  return ViewPlugin.fromClass<FencedCodeFormatButtonPlugin>(
    class implements FencedCodeFormatButtonPlugin {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (p) => p.decorations,
    }
  );
}
