// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { markdownLanguageExtension } from '../markdownLanguage';
import { fencedCodeMarkerDecoration } from './fencedCodeMarkerDecoration';

/**
 * Mirrors headingMarkerDecoration.test.ts — the closest existing analog
 * this construct is built on (`liveMarkDecoration`, `'node-range'`
 * engagement). See fencedCodeMarkerDecoration.ts's own doc comment for
 * why `'node-range'` (not heading/blockquote's `'physical-line'`) is the
 * right engagement mode here: the caret must reveal both fences from
 * anywhere inside the code body, not only when it sits on a fence's own
 * line.
 */
function mountView(doc: string, initialAnchor: number | null = null): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    selection: initialAnchor === null ? undefined : { anchor: initialAnchor },
    extensions: [markdownLanguageExtension(), fencedCodeMarkerDecoration()],
  });
  return new EditorView({ state, parent });
}

const jsFence = ['```js', 'const hello = "world";', '```'].join('\n');

describe('fencedCodeMarkerDecoration', () => {
  it('at rest, both fence markers have no DOM presence — the code content remains', () => {
    const text = `${jsFence}\n\nOther`;
    const view = mountView(text, text.indexOf('Other'));

    expect(view.dom.textContent).not.toContain('```');
    expect(view.dom.textContent).toContain('const hello = "world";');
  });

  it('reveals both fence markers once the caret is inside the code content', () => {
    const view = mountView(jsFence);

    view.dispatch({ selection: { anchor: jsFence.indexOf('hello') } });

    const text = view.dom.textContent ?? '';
    expect(text).toContain('```js');
    expect(text.match(/```/g)).toHaveLength(2);
  });

  it('reveals both fence markers when the selection sits on the opening fence line itself', () => {
    const view = mountView(jsFence);

    view.dispatch({ selection: { anchor: 1 } }); // inside "```js"

    const text = view.dom.textContent ?? '';
    expect(text.match(/```/g)).toHaveLength(2);
  });

  it('reveals both fence markers when the selection sits on the closing fence line itself', () => {
    const view = mountView(jsFence);

    view.dispatch({ selection: { anchor: jsFence.length - 1 } }); // inside closing "```"

    const text = view.dom.textContent ?? '';
    expect(text.match(/```/g)).toHaveLength(2);
  });

  it('re-collapses both markers once the selection leaves the fenced block', () => {
    const text = `${jsFence}\n\nOther text`;
    const view = mountView(text);

    view.dispatch({ selection: { anchor: jsFence.indexOf('hello') } });
    expect(view.dom.textContent).toContain('```js');

    view.dispatch({ selection: { anchor: view.state.doc.length } });
    expect(view.dom.textContent).not.toContain('```');
    expect(view.dom.textContent).toContain('const hello = "world";');
  });

  it('a selection spanning from outside into the block does not reveal it (containment, not overlap)', () => {
    const text = `before\n\n${jsFence}`;
    const view = mountView(text);

    view.dispatch({ selection: { anchor: 0, head: text.indexOf('hello') } });

    expect(view.dom.textContent).not.toContain('```');
  });

  it('tilde fences (~~~) conceal and reveal the same way', () => {
    const text = ['~~~js', 'const hello = "world";', '~~~'].join('\n');
    const view = mountView(`${text}\n\nOther`, text.length + 2);

    expect(view.dom.textContent).not.toContain('~~~');

    view.dispatch({ selection: { anchor: text.indexOf('hello') } });
    const revealed = view.dom.textContent ?? '';
    expect(revealed.match(/~~~/g)).toHaveLength(2);
  });

  it('a fence left unclosed at document end conceals its one real marker without throwing', () => {
    // An unclosed fence has no terminator (CommonMark: it runs to the end
    // of the enclosing block, blank lines included) — placing the
    // preceding paragraph *before* it, with the initial anchor there, is
    // what keeps the anchor genuinely outside the (never-closing)
    // `FencedCode` node.
    const doc = 'Other\n\n```js\nconst x = 1;';
    const view = mountView(doc, doc.indexOf('Other'));

    expect(() => view.dom.textContent).not.toThrow();
    expect(view.dom.textContent).not.toContain('```');
    expect(view.dom.textContent).toContain('const x = 1;');

    view.dispatch({ selection: { anchor: doc.indexOf('x = 1') } });
    expect(view.dom.textContent).toContain('```js');
  });

  it('the language info string (CodeInfo) is never concealed, at rest or engaged', () => {
    const text = `${jsFence}\n\nOther`;
    const view = mountView(text, text.indexOf('Other'));
    expect(view.dom.textContent).toContain('js');

    view.dispatch({ selection: { anchor: jsFence.indexOf('hello') } });
    expect(view.dom.textContent).toContain('js');
  });

  it('a fence with no info string collapses and reveals just the backtick runs', () => {
    const text = ['```', 'plain', '```'].join('\n');
    const view = mountView(`${text}\n\nOther`, text.length + 2);

    expect(view.dom.textContent).not.toContain('```');
    expect(view.dom.textContent).toContain('plain');

    view.dispatch({ selection: { anchor: text.indexOf('plain') } });
    expect((view.dom.textContent ?? '').match(/```/g)).toHaveLength(2);
  });

  it('introduces no new DOM wrapper structure — engaged/collapsed markers are plain spans over real doc text', () => {
    const view = mountView(jsFence);
    view.dispatch({ selection: { anchor: jsFence.indexOf('hello') } });

    // No widget/container element was introduced for this construct —
    // every `.cm-marker` span wraps real source text, same shape as
    // headingMarkerDecoration's own engaged marker.
    const markers = view.dom.querySelectorAll('.cm-fenced-code-marker');
    expect(markers.length).toBeGreaterThan(0);
    markers.forEach((marker) => {
      expect(marker.tagName).toBe('SPAN');
      expect(marker.textContent).toMatch(/^`{3,}$/);
    });
  });
});
