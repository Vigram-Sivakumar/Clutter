// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';

import { coordsAtFencedCodeControlWidget } from './fencedCodeControlWidgetCoords';

/**
 * What this test suite can and can't verify, stated explicitly: jsdom has
 * no real layout engine — `getBoundingClientRect()`/`getClientRects()`
 * always return zeroed rects, and CSS `position: absolute` is never
 * actually applied. So the *bug this fix addresses* (a caret rendering at
 * a button's real, CSS-displaced screen position instead of its logical
 * document position) is not something a jsdom test can reproduce or
 * disprove — that was verified live, in the real Clutter webapp, per this
 * feature's own investigation (see `docs/editor-architecture-decisions.md`).
 *
 * What jsdom *can* verify, and what these tests actually check: the
 * traversal logic itself — given a DOM shaped exactly like CM6 renders it
 * (a real preceding node, then zero or more `.cm-media-control` widget
 * buttons in a row), does `coordsAtFencedCodeControlWidget` correctly walk
 * back past every widget button to the one real node before them, for any
 * of the Copy/Format/Actions widget being the one asked? That's ordinary,
 * meaningful jsdom-testable DOM behavior, independent of real layout.
 */
function stubClientRects(el: Element, rect: DOMRect): void {
  el.getClientRects = () => [rect] as unknown as DOMRectList;
}

function makeRect(left: number): DOMRect {
  return { left, right: left, top: 0, bottom: 10, width: 0, height: 10, x: left, y: 0 } as DOMRect;
}

describe('coordsAtFencedCodeControlWidget', () => {
  it('returns the immediately preceding node\'s trailing rect when there is exactly one widget', () => {
    const line = document.createElement('div');
    const buffer = document.createElement('img');
    buffer.className = 'cm-widgetBuffer';
    stubClientRects(buffer, makeRect(390));
    const copyButton = document.createElement('button');
    copyButton.className = 'cm-media-control cm-code-block-copy';
    line.append(buffer, copyButton);

    const rect = coordsAtFencedCodeControlWidget(copyButton);

    expect(rect?.left).toBe(390);
  });

  it('walks back past multiple stacked widgets (Format, then Copy, then Actions) to the same real node, regardless of which one is asked', () => {
    const line = document.createElement('div');
    const buffer = document.createElement('img');
    buffer.className = 'cm-widgetBuffer';
    stubClientRects(buffer, makeRect(657));
    const formatButton = document.createElement('button');
    formatButton.className = 'cm-media-control cm-code-block-format';
    const copyButton = document.createElement('button');
    copyButton.className = 'cm-media-control cm-code-block-copy';
    const actionsButton = document.createElement('button');
    actionsButton.className = 'cm-media-control cm-code-block-actions';
    line.append(buffer, formatButton, copyButton, actionsButton);

    expect(coordsAtFencedCodeControlWidget(formatButton)?.left).toBe(657);
    expect(coordsAtFencedCodeControlWidget(copyButton)?.left).toBe(657);
    expect(coordsAtFencedCodeControlWidget(actionsButton)?.left).toBe(657);
  });

  it('falls back to a bare text node (no wrapping element) via a collapsed Range, when there is no marker/buffer span', () => {
    const line = document.createElement('div');
    const text = document.createTextNode('js');
    const copyButton = document.createElement('button');
    copyButton.className = 'cm-media-control cm-code-block-copy';
    line.append(text, copyButton);

    // jsdom's Range.getClientRects() also returns an empty list, so this
    // only exercises the "no rects, fall back to getBoundingClientRect()"
    // branch — real pixel values are, again, a live-only concern.
    expect(() => coordsAtFencedCodeControlWidget(copyButton)).not.toThrow();
  });

  it('returns null when nothing precedes the widget at all (should not happen for these three widgets in practice, but must degrade safely)', () => {
    const line = document.createElement('div');
    const copyButton = document.createElement('button');
    copyButton.className = 'cm-media-control cm-code-block-copy';
    line.append(copyButton);

    expect(coordsAtFencedCodeControlWidget(copyButton)).toBeNull();
  });
});
