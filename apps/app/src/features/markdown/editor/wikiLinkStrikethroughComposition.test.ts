// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Regression coverage for docs/editor-architecture-decisions.md's "Inline
 * formatting composition at the token level" entry. Two independent
 * decorating contexts were found to break `.tok-wikilink`'s (and, more
 * generally, any atomic/`display:inline-flex`-boxed widget's)
 * `text-decoration-line`:
 *   - `~~[[Page]]~~` (Strikethrough) — now fixed by the tree-based
 *     composition mechanism (`collectActiveInlineClasses` in
 *     `inlineLivePreviewParticipants.ts`), covered by DOM-level
 *     classList assertions in `inlineLivePreviewRegion.test.ts` (Tag/Date)
 *     and `wikilink/wikiLinkLivePreview.test.ts` (WikiLink) — not
 *     duplicated here, since this file is CSS-source-only (jsdom cannot
 *     compute real paint/layout).
 *   - `- [x] text [[Page]]` (a completed task's own line-level
 *     strikethrough, `.cm-line:has(.cm-task-checkbox
 *     [aria-checked='true'])`) — a genuinely different state source
 *     (line-level, from `taskCheckboxDecoration.ts`, not syntax-tree
 *     ancestry) that the tree-only composition mechanism deliberately
 *     does not cover. This one is still fixed by its own CSS descendant
 *     selector, unchanged, and this file guards that it stays in place.
 *
 * What's provable at the CSS-source level, and what would regress
 * silently otherwise:
 *   - the completed-task rule still exists (removing it, on the
 *     assumption the tree-based mechanism "handles strikethrough now,"
 *     would silently reintroduce that regression — they are different
 *     state sources, per the architecture doc entry);
 *   - the superseded `.tok-strike .tok-wikilink` descendant-selector rule
 *     is gone (composition now happens by the widget carrying `tok-strike`
 *     directly, so no ancestor selector should exist for it any more);
 *   - the rejected inherit-chain fix was never reintroduced on the
 *     unrelated `.tok-strong`/`.tok-emphasis`/`.tok-highlight` content-mark
 *     classes.
 */
describe('MarkdownEditor.css — WikiLink text-decoration composition', () => {
  const css = readFileSync(join(__dirname, 'MarkdownEditor.css'), 'utf8');

  it('declares text-decoration-line: line-through for .tok-wikilink under a completed-task-line ancestor (independent of the tree-based composition mechanism, still needed)', () => {
    const match = css.match(
      /\.cm-editor\s+\.cm-line:has\(\.cm-task-checkbox\[aria-checked='true'\]\)\s+\.tok-wikilink\s*\{([^}]*)\}/
    );
    expect(
      match,
      ".cm-editor .cm-line:has(.cm-task-checkbox[aria-checked='true']) .tok-wikilink rule not found"
    ).not.toBeNull();
    expect(match![1]).toMatch(/text-decoration-line\s*:\s*line-through\s*;/);
  });

  it('no longer declares a .tok-strike .tok-wikilink descendant-selector rule — superseded by tree-based class composition', () => {
    const match = css.match(/\.cm-editor\s+\.tok-strike\s+\.tok-wikilink\s*\{/);
    expect(
      match,
      '.tok-strike .tok-wikilink should no longer exist: .tok-wikilink now carries tok-strike directly, so the plain .tok-strike rule already applies with no ancestor selector'
    ).toBeNull();
  });

  it('does not reintroduce the rejected inherit-chain fix on unrelated formatting-mark classes', () => {
    for (const selector of ['\\.tok-strong', '\\.tok-emphasis', '\\.tok-highlight']) {
      const ruleRegex = new RegExp(`\\.cm-editor\\s+${selector}\\s*\\{([^}]*)\\}`, 'g');
      let ruleMatch: RegExpExecArray | null;
      while ((ruleMatch = ruleRegex.exec(css))) {
        expect(
          ruleMatch[1],
          `${selector.replace(/\\/g, '')}'s rule must not declare text-decoration-line — composition happens at the widget's own element, never by touching unrelated marker classes`
        ).not.toMatch(/text-decoration-line/);
      }
    }
  });
});
