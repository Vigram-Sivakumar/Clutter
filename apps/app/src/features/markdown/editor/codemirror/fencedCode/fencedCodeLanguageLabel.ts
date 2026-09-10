import { LanguageDescription } from '@codemirror/language';

import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

/**
 * Resolves a fenced code block's raw `CodeInfo` text to a friendly display
 * label — `js` → `JavaScript`, `py` → `Python`, etc. — by matching against
 * `fencedCodeLanguageDescriptions` (via `LanguageDescription.matchLanguageName`,
 * the exact same lookup `@codemirror/lang-markdown`'s own `getCodeParser`
 * uses internally to resolve `codeLanguages`, confirmed against its
 * installed source) and returning the matched entry's own `name` directly.
 *
 * **Deliberately no second alias/display-name table.** `fencedCodeLanguages.ts`'s
 * own `name` fields are the canonical, properly-cased display form
 * (`JavaScript`, not `javascript`) for exactly this reason — this registry
 * is the single source of truth for both what a fence's info string
 * *parses as* and what it's *displayed as*. An earlier version of this
 * file kept a separate `canonical name → display string` map alongside
 * the registry; that was corrected into the registry itself owning its
 * own display casing, so there is nothing left for this function to look
 * up beyond the match.
 *
 * `rawInfo` is normalized the same way CM6 itself normalizes it before
 * matching (`getCodeParser`: "strip anything after whitespace") — an info
 * string like `js title="x"` (a convention some Markdown flavors use for
 * extra metadata) matches on `js` alone, not the full string.
 *
 * An unrecognized language (edge case: unknown info string) falls back to
 * the raw, as-typed text itself (trimmed of the same leading/trailing
 * whitespace CM6's own normalization strips) rather than `null` — the
 * label still shows *something* meaningful the user actually wrote, per
 * "unknown language fails gracefully" rather than disappearing. Only a
 * genuinely empty info string (no language at all) returns `null` — the
 * caller's signal to render no label.
 */
export function friendlyLanguageLabel(rawInfo: string): string | null {
  const normalized = /\S*/.exec(rawInfo.trim())?.[0] ?? '';
  if (!normalized) {
    return null;
  }

  const matched = LanguageDescription.matchLanguageName(
    fencedCodeLanguageDescriptions,
    normalized,
    true
  );

  return matched instanceof LanguageDescription ? matched.name : normalized;
}
