// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap } from '@codemirror/commands';

import { markdownLanguageExtension } from '../markdownLanguage';
import { wikiLinkLivePreview } from './wikiLinkLivePreview';
import { wikiLinkConcealedPrefixNavigation } from './wikiLinkConcealedPrefixNavigation';
import type { ResolveWikiLink } from './wikiLinkResolution';

/**
 * Regression coverage for the arrow-key-stuck-at-`[[` investigation's
 * final fix: a folder-qualified WikiLink's concealed prefix (e.g. the
 * `Projects/Design/` in `[[Projects/Design/My Note]]`) is real document
 * text that CM6's ordinary character-by-character ArrowLeft/ArrowRight
 * motion has to step through one keystroke at a time with no visible
 * caret movement in between — reading as "the cursor is stuck." This
 * keymap hops the caret across exactly that concealed range in one
 * keystroke when it sits at either edge, and does nothing anywhere else.
 */
function mountView(doc: string, resolver?: ResolveWikiLink): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const extensions: Extension[] = [
    markdownLanguageExtension(),
    wikiLinkLivePreview(() => resolver),
    // defaultKeymap alongside the fix under test, mirroring production
    // (buildEditorExtensions.ts always registers both) — needed so plain
    // ArrowLeft/ArrowRight has ordinary ArrowLeft/ArrowRight fallback
    // handling to fall through to at every position this extension itself
    // doesn't act on.
    keymap.of(defaultKeymap),
    wikiLinkConcealedPrefixNavigation(),
  ];
  const state = EditorState.create({ doc, extensions });
  return new EditorView({ state, parent });
}

const resolvedAs = (displayLabel: string): ResolveWikiLink => () => ({
  status: 'resolved',
  icon: 'note',
  emoji: null,
  displayLabel,
  activate: () => {},
});

function pressArrow(view: EditorView, key: 'ArrowLeft' | 'ArrowRight'): void {
  const event = new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true });
  view.contentDOM.dispatchEvent(event);
}

describe('wikiLinkConcealedPrefixNavigation', () => {
  describe('ArrowRight hops the concealed folder prefix in one keystroke', () => {
    it('caret sitting right after [[ (the concealed prefix\'s left edge) jumps to its right edge, right before the visible filename', () => {
      const doc = 'before [[Projects/Design/My Note]] after';
      const nodeFrom = 'before '.length;
      const leftEdge = nodeFrom + 2; // right after "[["
      const view = mountView(doc, resolvedAs('My Note'));
      view.dispatch({ selection: { anchor: leftEdge } });

      pressArrow(view, 'ArrowRight');

      // "Projects/Design/" is 16 characters — the hop must land exactly
      // past all of them, not one character short or long (a single
      // ordinary ArrowRight, by contrast, would only reach leftEdge + 1).
      expect(view.state.selection.main.head).toBe(leftEdge + 'Projects/Design/'.length);
    });

    it('does not touch the document — this is a pure selection dispatch', () => {
      const doc = 'before [[Projects/Design/My Note]] after';
      const nodeFrom = 'before '.length;
      const view = mountView(doc, resolvedAs('My Note'));
      view.dispatch({ selection: { anchor: nodeFrom + 2 } });

      pressArrow(view, 'ArrowRight');

      expect(view.state.doc.toString()).toBe(doc);
    });
  });

  describe('ArrowLeft hops the concealed folder prefix in one keystroke, symmetrically', () => {
    it('caret sitting right before the visible filename (the concealed prefix\'s right edge) jumps back to its left edge, right after [[', () => {
      const doc = 'before [[Projects/Design/My Note]] after';
      const nodeFrom = 'before '.length;
      const rightEdge = nodeFrom + 2 + 'Projects/Design/'.length;
      const view = mountView(doc, resolvedAs('My Note'));
      view.dispatch({ selection: { anchor: rightEdge } });

      pressArrow(view, 'ArrowLeft');

      expect(view.state.selection.main.head).toBe(nodeFrom + 2);
    });
  });

  describe('does not fire anywhere else — falls through to CM6\'s ordinary single-character ArrowLeft/ArrowRight', () => {
    it('a slash-free WikiLink has nothing concealed — ArrowRight from just inside [[ moves by exactly one ordinary character', () => {
      const doc = 'before [[Note title]] after';
      const nodeFrom = 'before '.length;
      const view = mountView(doc, resolvedAs('Note title'));
      view.dispatch({ selection: { anchor: nodeFrom + 2 } });

      pressArrow(view, 'ArrowRight');

      expect(view.state.selection.main.head).toBe(nodeFrom + 3);
    });

    it('a caret one character short of the concealed prefix\'s left edge does not hop — ordinary single-character motion applies first', () => {
      const doc = 'before [[Projects/Design/My Note]] after';
      const nodeFrom = 'before '.length;
      const view = mountView(doc, resolvedAs('My Note'));
      // One character before "[[" itself, not yet at the concealed range's edge.
      view.dispatch({ selection: { anchor: nodeFrom + 1 } });

      pressArrow(view, 'ArrowRight');

      expect(view.state.selection.main.head).toBe(nodeFrom + 2);
    });

    it('a caret already inside the concealed range (mid-prefix) does not hop in either direction — only the exact edges trigger it', () => {
      const doc = 'before [[Projects/Design/My Note]] after';
      const nodeFrom = 'before '.length;
      const midPrefix = nodeFrom + 2 + 3; // a few characters into "Projects/Design/"
      const view = mountView(doc, resolvedAs('My Note'));

      view.dispatch({ selection: { anchor: midPrefix } });
      pressArrow(view, 'ArrowRight');
      expect(view.state.selection.main.head).toBe(midPrefix + 1);

      view.dispatch({ selection: { anchor: midPrefix } });
      pressArrow(view, 'ArrowLeft');
      expect(view.state.selection.main.head).toBe(midPrefix - 1);
    });

    it('a non-empty selection is left entirely alone — this keymap only ever acts on a collapsed caret, CM6\'s default collapse-to-edge applies instead', () => {
      const doc = 'before [[Projects/Design/My Note]] after';
      const nodeFrom = 'before '.length;
      const leftEdge = nodeFrom + 2;
      const view = mountView(doc, resolvedAs('My Note'));
      view.dispatch({ selection: { anchor: leftEdge, head: leftEdge + 3 } });

      pressArrow(view, 'ArrowRight');

      // Ordinary CM6 behavior for ArrowRight on a non-empty selection:
      // collapse to the selection's right edge — never the hop target.
      expect(view.state.selection.main.head).toBe(leftEdge + 3);
      expect(view.state.selection.main.empty).toBe(true);
    });

    it('plain text with no WikiLink at all is completely unaffected', () => {
      const view = mountView('just an ordinary sentence with no links at all');
      view.dispatch({ selection: { anchor: 5 } });

      pressArrow(view, 'ArrowRight');

      expect(view.state.selection.main.head).toBe(6);
    });
  });

  describe('composes correctly with the rest of WikiLink navigation', () => {
    it('stepping through a folder-qualified WikiLink end to end lands on every visible character and hops the prefix exactly once', () => {
      const prefix = 'Projects/Design/';
      const title = 'My Note';
      const doc = `[[${prefix}${title}]]`;
      const view = mountView(doc, resolvedAs(title));
      view.dispatch({ selection: { anchor: 0 } }); // engages immediately (boundary-inclusive)

      const headsVisited: number[] = [view.state.selection.main.head];
      // "[", "[" (2 plain chars) -> hop across the concealed prefix -> title (one step per char) -> "]", "]" (2 plain chars)
      const totalPresses = 2 + 1 + title.length + 2;
      for (let i = 0; i < totalPresses; i++) {
        pressArrow(view, 'ArrowRight');
        headsVisited.push(view.state.selection.main.head);
      }

      const expected = [0, 1, 2, 2 + prefix.length];
      for (let i = 1; i <= title.length + 2; i++) {
        expected.push(2 + prefix.length + i);
      }
      expect(headsVisited).toEqual(expected);
      expect(view.state.selection.main.head).toBe(doc.length);
      expect(view.state.doc.toString()).toBe(doc);
    });
  });
});
