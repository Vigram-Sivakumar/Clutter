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
import type { SyntaxNodeRef } from '@lezer/common';

import { friendlyLanguageLabel } from '../fencedCode/fencedCodeLanguageLabel';
import { FencedCodeLanguageLabelWidget } from '../fencedCode/FencedCodeLanguageLabelWidget';
import { isTokenEngaged } from '../semanticToken/tokenEngagement';

/**
 * Friendly-name rendering for a fenced code block's `CodeInfo` (the raw
 * `js`/`py`/etc. language identifier): replaced with a friendly label
 * (`js` → `JavaScript`) while the enclosing `FencedCode` is at rest,
 * reverting to plain raw source text the instant it's engaged — the same
 * "atomic widget at rest, plain text engaged" contract the semantic-token
 * family (`WikiLink`/`Tag`/`Date`, `widgetReplaceRenderer` in
 * `inlineLivePreviewParticipants.ts`) already uses.
 *
 * **Not** registered through that shared participant map, deliberately:
 * its engagement is hardwired to the decorated node's *own* range
 * (`isTokenEngaged` on the participant node itself), and `CodeInfo`'s
 * desired engagement scope is its *enclosing* `FencedCode` node — the
 * same "reveal-on-engagement scope doesn't match this node's own range"
 * mismatch `inlineLivePreviewRegion.ts`'s own doc comment already
 * documents for heading content, which took the same way out (a small,
 * standalone mechanism, not a forced fit into the shared map). This file
 * is that same escape hatch for `CodeInfo`, reusing
 * `fencedCodeMarkerDecoration.ts`'s own `isTokenEngaged(FencedCode)` query
 * so the label and the fence markers reveal/conceal in exact lockstep —
 * a single caret move never shows one without the other.
 *
 * Deliberately **not** atomic (`EditorView.atomicRanges`): unlike
 * WikiLink/Tag/Date, whose at-rest widget stands in for content the user
 * edits by *engaging* the whole construct, `CodeInfo`'s raw text is the
 * one thing this feature explicitly leaves on "normal engagement/editing
 * behavior" — unengaged, it's a friendly label rather than the raw
 * `Decoration.replace` reveal-on-engage contract's "atomic until
 * engaged" half also implies, since the containing `FencedCode`'s own
 * atomicity is already owned by `fencedCodeMarkerDecoration.ts` and
 * nothing here needs a second, competing claim on it.
 */
const getCodeInfo = (node: SyntaxNodeRef) => {
  if (node.name !== 'FencedCode') {
    return null;
  }
  const child = node.node.getChild('CodeInfo');
  return child ?? null;
};

function buildDecorations(view: EditorView): DecorationSet {
  const ranges: { from: number; to: number; decoration: ReturnType<typeof Decoration.replace> }[] =
    [];

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const codeInfo = getCodeInfo(node);
        if (!codeInfo) {
          return;
        }

        if (isTokenEngaged(view.state, { from: node.from, to: node.to })) {
          return;
        }

        const raw = view.state.sliceDoc(codeInfo.from, codeInfo.to);
        const label = friendlyLanguageLabel(raw);
        if (!label) {
          return;
        }

        ranges.push({
          from: codeInfo.from,
          to: codeInfo.to,
          decoration: Decoration.replace({ widget: new FencedCodeLanguageLabelWidget(label) }),
        });
      },
    });
  }

  return Decoration.set(
    ranges.map(({ from, to, decoration }) => decoration.range(from, to)),
    true
  );
}

interface FencedCodeLanguageLabelPlugin extends PluginValue {
  decorations: DecorationSet;
}

export function fencedCodeLanguageLabelDecoration(): Extension {
  return ViewPlugin.fromClass<FencedCodeLanguageLabelPlugin>(
    class implements FencedCodeLanguageLabelPlugin {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || update.selectionSet) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: (p) => p.decorations,
    }
  );
}
