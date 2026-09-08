// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { CompletionContext, type CompletionResult, type CompletionSource } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { markdownLanguageExtension } from '../markdownLanguage';
import { embedCompletionSource } from './embedCompletionSource';
import { wikiLinkCompletionSource } from '../wikilink/wikiLinkCompletionSource';
import type { GetEmbedHeadingSuggestions, GetEmbedSuggestions } from './embedSuggestion';
import type { GetWikiLinkSuggestions } from '../wikilink/wikiLinkSuggestion';

function mountView(doc: string): EditorView {
  const parent = document.createElement('div');
  document.body.appendChild(parent);
  const state = EditorState.create({ doc, extensions: [markdownLanguageExtension()] });
  return new EditorView({ state, parent });
}

function contextAt(view: EditorView, pos: number): CompletionContext {
  return new CompletionContext(view.state, pos, false);
}

/** embedCompletionSource/wikiLinkCompletionSource are always synchronous. */
function call(source: CompletionSource, context: CompletionContext): CompletionResult | null {
  return source(context) as CompletionResult | null;
}

describe('embedCompletionSource — fresh, not-yet-closed ![[query', () => {
  it('returns null when the cursor is not inside an in-progress ![[...', () => {
    const view = mountView('hello world');
    const getSuggestions = vi.fn();
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 5));

    expect(result).toBeNull();
    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it('queries suggestions with the text typed after ![[, and returns them as options', () => {
    const view = mountView('x ![[hero');
    const getSuggestions: GetEmbedSuggestions = vi.fn(() => [
      { kind: 'resource' as const, path: 'Projects/hero.png', title: 'hero.png', breadcrumb: 'Projects', resourceKind: 'image' as const },
    ]);
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 9));

    expect(getSuggestions).toHaveBeenCalledWith('hero');
    expect(result?.from).toBe(2);
    expect(result?.options).toHaveLength(1);
    expect(result?.options[0]?.label).toBe('hero.png');
  });

  it('supports a folder-qualified query (![[Projects/hero)', () => {
    const view = mountView('x ![[Projects/hero');
    const getSuggestions: GetEmbedSuggestions = vi.fn(() => [
      { kind: 'resource' as const, path: 'Projects/hero.png', title: 'hero.png', breadcrumb: 'Projects', resourceKind: 'image' as const },
    ]);
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 18));

    expect(getSuggestions).toHaveBeenCalledWith('Projects/hero');
    expect(result?.options).toHaveLength(1);
  });

  it('supports a bare folder-prefix query (![[Projects/) showing everything under that folder', () => {
    const view = mountView('x ![[Projects/');
    const getSuggestions: GetEmbedSuggestions = vi.fn(() => [
      { kind: 'resource' as const, path: 'Projects/hero.png', title: 'hero.png', breadcrumb: 'Projects', resourceKind: 'image' as const },
      { kind: 'resource' as const, path: 'Projects/plan.pdf', title: 'plan.pdf', breadcrumb: 'Projects', resourceKind: 'pdf' as const },
    ]);
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 14));

    expect(getSuggestions).toHaveBeenCalledWith('Projects/');
    expect(result?.options).toHaveLength(2);
  });

  it('returns null when the query contains an alias separator — same rule WikiLink already applies', () => {
    const view = mountView('x ![[hero.png|Caption');
    const getSuggestions = vi.fn();
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 21));

    expect(result).toBeNull();
    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it('returns null when no suggester is injected', () => {
    const view = mountView('x ![[hero');
    const source = embedCompletionSource(() => undefined);

    expect(call(source, contextAt(view, 9))).toBeNull();
  });

  it("a resource option's apply() replaces the whole ![[query with the canonical Embed text", () => {
    const view = mountView('x ![[hero y');
    const getSuggestions: GetEmbedSuggestions = () => [
      { kind: 'resource', path: 'Projects/hero.png', title: 'hero.png', breadcrumb: 'Projects', resourceKind: 'image' as const },
    ];
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 9));
    const option = result?.options[0];
    expect(option).toBeDefined();

    if (typeof option?.apply === 'function') {
      option.apply(view, option, result?.from ?? 0, 9);
    }

    expect(view.state.doc.toString()).toBe('x ![[Projects/hero.png]] y');
  });

  it("apply() places the cursor immediately after the closing ']]' it just inserted", () => {
    const view = mountView('![[hero');
    const getSuggestions: GetEmbedSuggestions = () => [
      { kind: 'resource', path: 'hero.png', title: 'hero.png', breadcrumb: null, resourceKind: 'image' as const },
    ];
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 7));
    const option = result?.options[0];

    if (typeof option?.apply === 'function') {
      option.apply(view, option, result?.from ?? 0, 7);
    }

    expect(view.state.doc.toString()).toBe('![[hero.png]]');
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
  });
});

describe('embedCompletionSource — reactivating inside an already-closed Embed', () => {
  it('offers completions when the cursor sits inside the reference portion, queried by the FULL current reference text', () => {
    // "x ![[hero.png]] y" — reference "hero.png" occupies indices 5..13.
    const view = mountView('x ![[hero.png]] y');
    const getSuggestions: GetEmbedSuggestions = vi.fn(() => [
      { kind: 'resource' as const, path: 'hero.png', title: 'hero.png', breadcrumb: null, resourceKind: 'image' as const },
    ]);
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 8)); // mid-reference

    expect(getSuggestions).toHaveBeenCalledWith('hero.png');
    expect(result).not.toBeNull();
    expect(result?.from).toBe(5);
    expect(result?.to).toBe(13);
  });

  it('still offers completions for a folder-qualified at-rest embed, querying only the visible filename segment', () => {
    // "x ![[Projects/hero.png]] y" — reference zone is "Projects/hero.png"
    // (indices 5..22); the visible (post-folder) segment is "hero.png".
    const view = mountView('x ![[Projects/hero.png]] y');
    const getSuggestions: GetEmbedSuggestions = vi.fn(() => [
      { kind: 'resource' as const, path: 'Projects/hero.png', title: 'hero.png', breadcrumb: 'Projects', resourceKind: 'image' as const },
    ]);
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 7)); // inside "Projects"

    expect(getSuggestions).toHaveBeenCalledWith('hero.png');
    expect(result?.to).toBe(22); // right before the closing "]]", folder included
  });

  it('returns null when the cursor is inside the alias portion, if the syntax happens to carry one', () => {
    const view = mountView('x ![[hero.png|Caption]] y');
    const getSuggestions = vi.fn();
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 18)); // well past the "|"

    expect(result).toBeNull();
    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it("apply() places the cursor after the full closed construct — including a pre-existing '|alias' — mirroring WikiLink's identical fix", () => {
    const view = mountView('![[hero.png|Caption]]');
    const getSuggestions: GetEmbedSuggestions = () => [
      { kind: 'resource', path: 'hero.png', title: 'hero.png', breadcrumb: null, resourceKind: 'image' as const },
    ];
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 8)); // mid-reference, inside "hero.png"
    const option = result?.options[0];
    expect(option).toBeDefined();

    if (typeof option?.apply === 'function') {
      option.apply(view, option, result?.from ?? 0, result?.to ?? 0);
    }

    expect(view.state.doc.toString()).toBe('![[hero.png|Caption]]');
    expect(view.state.selection.main.head).toBe(view.state.doc.length);
    expect(view.state.selection.main.anchor).toBe(view.state.doc.length);
  });

  it('accepting a reactivated reference completion replaces only the reference zone, leaving surrounding brackets untouched', () => {
    const view = mountView('x ![[her]] y');
    const getSuggestions: GetEmbedSuggestions = () => [
      { kind: 'resource', path: 'hero.png', title: 'hero.png', breadcrumb: null, resourceKind: 'image' as const },
    ];
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 8));
    const option = result?.options[0];
    expect(option).toBeDefined();

    if (typeof option?.apply === 'function') {
      option.apply(view, option, result?.from ?? 0, result?.to ?? 0);
    }

    expect(view.state.doc.toString()).toBe('x ![[hero.png]] y');
  });

  it(
    "regression: accepting a reactivated reference completion on an ALREADY-CLOSED Embed places the cursor " +
      "after the pre-existing ']]', not before it — mirrors wikiLinkCompletionSource.test.ts's identical regression",
    () => {
      const view = mountView('x ![[her]] y');
      const getSuggestions: GetEmbedSuggestions = () => [
        { kind: 'resource', path: 'hero.png', title: 'hero.png', breadcrumb: null, resourceKind: 'image' as const },
      ];
      const source = embedCompletionSource(() => getSuggestions);

      const result = call(source, contextAt(view, 8));
      const option = result?.options[0];
      expect(option).toBeDefined();

      if (typeof option?.apply === 'function') {
        option.apply(view, option, result?.from ?? 0, result?.to ?? 0);
      }

      expect(view.state.doc.toString()).toBe('x ![[hero.png]] y');
      // Right after the "]]" (index 5 + "![[".length... computed directly:
      // "x ![[hero.png]] y" — "]]" ends at index 15.
      expect(view.state.selection.main.head).toBe(15);
    }
  );

  it('a fully-emptied reference (![[]]) still lets the source attempt to query', () => {
    const view = mountView('x ![[]] y');
    const getSuggestions: GetEmbedSuggestions = vi.fn(() => []);
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 5)); // right after "![["

    expect(getSuggestions).toHaveBeenCalledWith('');
    expect(result).toBeNull(); // legitimately null — the injected suggester returned []
  });
});

describe('embedCompletionSource / wikiLinkCompletionSource — no trigger collision', () => {
  it('a bare [[ never activates the Embed completion source', () => {
    const view = mountView('x [[hero');
    const getSuggestions = vi.fn();
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 8));

    expect(result).toBeNull();
    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it('an in-progress ![[hero never activates the WikiLink completion source', () => {
    const view = mountView('x ![[hero');
    const getSuggestions = vi.fn();
    const source = wikiLinkCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 9));

    expect(result).toBeNull();
    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it('only the Embed source activates for ![[hero, WikiLink stays silent — both sources checked against the exact same document/position', () => {
    const view = mountView('x ![[hero');
    const getEmbedSuggestions: GetEmbedSuggestions = () => [
      { kind: 'resource', path: 'hero.png', title: 'hero.png', breadcrumb: null, resourceKind: 'image' as const },
    ];
    const getWikiLinkSuggestions = vi.fn();

    const embedResult = call(embedCompletionSource(() => getEmbedSuggestions), contextAt(view, 9));
    const wikiLinkResult = call(wikiLinkCompletionSource(() => getWikiLinkSuggestions), contextAt(view, 9));

    expect(embedResult?.options).toHaveLength(1);
    expect(wikiLinkResult).toBeNull();
    expect(getWikiLinkSuggestions).not.toHaveBeenCalled();
  });

  it('only the WikiLink source activates for a bare [[hero, Embed stays silent', () => {
    const view = mountView('x [[hero');
    const getWikiLinkSuggestions: GetWikiLinkSuggestions = () => [
      { kind: 'page', path: 'hero', title: 'hero', breadcrumb: null },
    ];
    const getEmbedSuggestions = vi.fn();

    const wikiLinkResult = call(wikiLinkCompletionSource(() => getWikiLinkSuggestions), contextAt(view, 8));
    const embedResult = call(embedCompletionSource(() => getEmbedSuggestions), contextAt(view, 8));

    expect(wikiLinkResult?.options).toHaveLength(1);
    expect(embedResult).toBeNull();
    expect(getEmbedSuggestions).not.toHaveBeenCalled();
  });
});

describe('embedCompletionSource — heading suggestions (![[Page#, ADR-032)', () => {
  it('switches to heading suggestions once the query contains #, scoped to the page portion', () => {
    const view = mountView('x ![[Note B#');
    const getSuggestions = vi.fn();
    const getHeadingSuggestions: GetEmbedHeadingSuggestions = vi.fn(() => [
      { kind: 'heading' as const, heading: 'Setup', level: 2 },
      { kind: 'heading' as const, heading: 'Appendix', level: 1 },
    ]);
    const source = embedCompletionSource(() => getSuggestions, () => getHeadingSuggestions);

    const result = call(source, contextAt(view, 12));

    expect(getSuggestions).not.toHaveBeenCalled();
    expect(getHeadingSuggestions).toHaveBeenCalledWith('Note B', '');
    expect(result?.options).toHaveLength(2);
    expect(result?.options[0]?.label).toBe('Setup');
  });

  it('filters heading suggestions as more of the heading query is typed', () => {
    const view = mountView('x ![[Note B#Roo');
    const getHeadingSuggestions: GetEmbedHeadingSuggestions = vi.fn(() => [{ kind: 'heading' as const, heading: 'Root causes', level: 1 }]);
    const source = embedCompletionSource(
      () => vi.fn(),
      () => getHeadingSuggestions
    );

    const result = call(source, contextAt(view, view.state.doc.length));

    expect(getHeadingSuggestions).toHaveBeenCalledWith('Note B', 'Roo');
    expect(result?.options).toHaveLength(1);
  });

  it('preserves a folder-qualified page portion when splitting on #', () => {
    const view = mountView('x ![[Notes/Note B#Set');
    const getHeadingSuggestions: GetEmbedHeadingSuggestions = vi.fn(() => []);
    const source = embedCompletionSource(
      () => vi.fn(),
      () => getHeadingSuggestions
    );

    call(source, contextAt(view, view.state.doc.length));

    expect(getHeadingSuggestions).toHaveBeenCalledWith('Notes/Note B', 'Set');
  });

  it('returns null for a # query when no heading suggester is injected', () => {
    const view = mountView('x ![[Note B#');
    const getSuggestions = vi.fn();
    const source = embedCompletionSource(() => getSuggestions);

    const result = call(source, contextAt(view, 12));

    expect(result).toBeNull();
    expect(getSuggestions).not.toHaveBeenCalled();
  });

  it("a heading option's apply() inserts the full page#heading target", () => {
    const view = mountView('x ![[Note B#Set y');
    const getHeadingSuggestions: GetEmbedHeadingSuggestions = () => [{ kind: 'heading', heading: 'Setup', level: 2 }];
    const source = embedCompletionSource(
      () => vi.fn(),
      () => getHeadingSuggestions
    );

    const result = call(source, contextAt(view, 15));
    const option = result?.options[0];
    expect(option).toBeDefined();

    if (typeof option?.apply === 'function') {
      option.apply(view, option, result?.from ?? 0, 15);
    }

    expect(view.state.doc.toString()).toBe('x ![[Note B#Setup]] y');
  });

  it('reactivating inside an already-closed ![[Page#Heading]] offers heading suggestions again, scoped to the page portion', () => {
    const view = mountView('x ![[Note B#Setup]] y');
    const getHeadingSuggestions: GetEmbedHeadingSuggestions = vi.fn(() => [{ kind: 'heading' as const, heading: 'Setup', level: 2 }]);
    const source = embedCompletionSource(
      () => vi.fn(),
      () => getHeadingSuggestions
    );

    const result = call(source, contextAt(view, 15)); // inside "Setup"

    expect(getHeadingSuggestions).toHaveBeenCalledWith('Note B', 'Setup');
    expect(result?.from).toBe(5);
    expect(result?.to).toBe(17); // right before the closing "]]"
  });

  it('a reactivated heading completion replaces the entire reference zone with the full page#heading text', () => {
    const view = mountView('x ![[Note B#Set]] y');
    const getHeadingSuggestions: GetEmbedHeadingSuggestions = () => [{ kind: 'heading', heading: 'Setup', level: 2 }];
    const source = embedCompletionSource(
      () => vi.fn(),
      () => getHeadingSuggestions
    );

    const result = call(source, contextAt(view, 14));
    const option = result?.options[0];
    expect(option).toBeDefined();

    if (typeof option?.apply === 'function') {
      option.apply(view, option, result?.from ?? 0, result?.to ?? 0);
    }

    expect(view.state.doc.toString()).toBe('x ![[Note B#Setup]] y');
  });
});
