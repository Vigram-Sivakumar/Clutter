// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history } from '@codemirror/commands';

import { markdownLanguageExtension } from '../markdownLanguage';
import { embedLivePreview } from './embedLivePreview';
import type { ResolveEmbedImage } from './embedImageResolution';
import type { ResolveEmbedPdf } from '../pdf/embedPdfResolution';
import type { PageEmbedResolution, ResolvePageEmbed } from '../../../render/blocks/pageEmbedResolution';
import type { NoteEmbedAncestry } from './noteEmbedAncestry';

/** Every fixture here targets a page (never a real Vault resource) — both resolvers always decline, matching real production wiring. */
const declineImage: ResolveEmbedImage = () => ({ status: 'unresolved', alt: '' });
const declinePdf: ResolveEmbedPdf = () => ({ status: 'non-pdf' });

function mountView(
  doc: string,
  resolvePageEmbed: ResolvePageEmbed,
  options: { onOpenPage?: (pageId: string) => void; ancestry?: NoteEmbedAncestry } = {}
): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({
    doc,
    extensions: [
      history(),
      markdownLanguageExtension(),
      embedLivePreview({
        resolveEmbedImage: () => declineImage,
        onImageClick: () => undefined,
        onOpenImageMenu: () => undefined,
        resolveEmbedPdf: () => declinePdf,
        onPdfEmbedClick: () => undefined,
        onOpenPdfMenu: () => undefined,
        resolvePageEmbed: () => resolvePageEmbed,
        onOpenPage: () => options.onOpenPage,
        ancestry: options.ancestry,
      }),
    ],
  });
  return new EditorView({ state, parent });
}

function resolverFor(pages: Record<string, PageEmbedResolution>): ResolvePageEmbed {
  return (path) => pages[path] ?? { status: 'unresolved', displayLabel: path };
}

describe('note embeds (embedLivePreview + NoteEmbedWidget)', () => {
  beforeEach(() => {
    class NoopResizeObserver {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    }
    vi.stubGlobal('ResizeObserver', NoopResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a resolved page target as a note embed card with the source note title and its content', () => {
    const view = mountView(
      '![[Other Note]]',
      resolverFor({
        'Other Note': { status: 'resolved', pageId: 'page-other', title: 'Other Note', markdown: '# Heading\n\nBody text.' },
      })
    );

    const card = view.dom.querySelector('.cm-note-embed');
    expect(card).not.toBeNull();
    expect(card?.querySelector('.cm-note-embed__open')?.textContent).toBe('Other Note');
    // Rendered through a real nested EditorView, not a hand-built DOM copy
    // — the embedded note's own content lives inside `.cm-content`.
    expect(card?.querySelector('.cm-content')?.textContent).toContain('Body text.');
  });

  it('opens the source note when the header button is activated', () => {
    const onOpenPage = vi.fn();
    const view = mountView(
      '![[Other Note]]',
      resolverFor({
        'Other Note': { status: 'resolved', pageId: 'page-other', title: 'Other Note', markdown: 'Body.' },
      }),
      { onOpenPage }
    );

    const button = view.dom.querySelector<HTMLButtonElement>('.cm-note-embed__open');
    button?.click();

    expect(onOpenPage).toHaveBeenCalledWith('page-other');
  });

  it('never renders an editable embed — the nested view is permanently read-only', () => {
    const view = mountView(
      '![[Other Note]]',
      resolverFor({
        'Other Note': { status: 'resolved', pageId: 'page-other', title: 'Other Note', markdown: 'Original content.' },
      })
    );

    const nestedContent = view.dom.querySelector<HTMLElement>('.cm-note-embed .cm-content');
    expect(nestedContent?.getAttribute('contenteditable')).toBe('false');

    // Reach into the nested view directly (CM6 exposes it via the DOM
    // node) and confirm a doc-changing transaction is actually blocked,
    // not merely hidden from the mouse/keyboard.
    const nestedEditorDom = view.dom.querySelector('.cm-note-embed .cm-editor');
    const nestedView = nestedEditorDom ? EditorView.findFromDOM(nestedEditorDom as HTMLElement) : null;
    expect(nestedView).not.toBeNull();
    nestedView?.dispatch({ changes: { from: 0, to: 0, insert: 'x' } });
    expect(nestedView?.state.doc.toString()).toBe('Original content.');
  });

  it('does not render a note embed for a direct self-embed — caught by ancestry, falls back to the generic broken-embed rendering', () => {
    const view = mountView(
      '![[This Note]]',
      resolverFor({
        'This Note': { status: 'resolved', pageId: 'page-self', title: 'This Note', markdown: '![[This Note]]' },
      }),
      { ancestry: { ancestryPageIds: new Set(['page-self']), depth: 0 } }
    );

    expect(view.dom.querySelector('.cm-note-embed')).toBeNull();
    expect(view.dom.querySelector('.cm-invalid-embed')).not.toBeNull();
  });

  it('never reveals raw Markdown syntax when the nested view\'s own selection lands inside a construct', () => {
    const view = mountView(
      '![[Other Note]]',
      resolverFor({
        'Other Note': {
          status: 'resolved',
          pageId: 'page-other',
          title: 'Other Note',
          markdown: '# Heading\n\nSome **bold** text.',
        },
      })
    );

    const nestedEditorDom = view.dom.querySelector('.cm-note-embed .cm-editor');
    const nestedView = nestedEditorDom ? EditorView.findFromDOM(nestedEditorDom as HTMLElement) : null;
    expect(nestedView).not.toBeNull();
    if (!nestedView) {
      return;
    }

    // At rest: the heading's `# ` marker and the bold word's `**` markers
    // are both collapsed (Decoration.replace) — neither raw marker
    // appears in the rendered text.
    expect(nestedView.dom.textContent).not.toContain('# Heading');
    expect(nestedView.dom.textContent).not.toContain('**bold**');

    // A click landing inside "bold" would dispatch exactly this kind of
    // selection-only transaction against the nested view's own state —
    // confirmed in the prior investigation that this happens even though
    // DOM focus never moves into the nested view. Simulate it directly.
    const boldFrom = nestedView.state.doc.toString().indexOf('bold');
    nestedView.dispatch({ selection: { anchor: boldFrom + 2 } });

    // Still never reveals — `isTokenEngaged`'s `state.readOnly` guard
    // means this nested, permanently read-only view can never enter an
    // engaged/revealed state, regardless of where its selection sits.
    expect(nestedView.dom.textContent).not.toContain('**bold**');

    // Same check for the heading marker, engaging its own line.
    const headingFrom = nestedView.state.doc.toString().indexOf('Heading');
    nestedView.dispatch({ selection: { anchor: headingFrom } });
    expect(nestedView.dom.textContent).not.toContain('# Heading');
  });

  it('does not render a note embed once an indirect cycle is detected deeper in the chain', () => {
    const resolvePageEmbed = resolverFor({
      'Note B': { status: 'resolved', pageId: 'page-b', title: 'Note B', markdown: '![[Note A]]' },
      'Note A': { status: 'resolved', pageId: 'page-a', title: 'Note A', markdown: '![[Note B]]' },
    });

    const view = mountView('![[Note B]]', resolvePageEmbed);

    // Top-level embed (B) renders fine — the cycle is one level deeper.
    const topCard = view.dom.querySelector('.cm-note-embed');
    expect(topCard).not.toBeNull();

    // Inside B's own nested view, embedding A back in renders fine too
    // (A hasn't been seen yet)...
    const nestedCard = topCard?.querySelector('.cm-note-embed') ?? null;
    expect(nestedCard).not.toBeNull();

    // ...but A's own attempt to re-embed B is the cycle, caught and
    // rendered as a broken embed instead of recursing forever.
    expect(nestedCard?.querySelector('.cm-note-embed')).toBeNull();
    expect(nestedCard?.querySelector('.cm-invalid-embed')).not.toBeNull();
  });
});
