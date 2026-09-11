import { LanguageDescription } from '@codemirror/language';

import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

/**
 * File extension (including the leading dot) per `fencedCodeLanguageDescriptions`'
 * own canonical `name` — the same registry `fencedCodeLanguageLabel.ts` and
 * `codeFormatting.ts` already key their own per-language lookups off of, so
 * "what does this language display as"/"is this language formattable"/"what
 * file extension does this save as" all share one source of truth for what
 * a language *is*, never a second alias table. Used by "Download code"
 * (`FencedCodeActionsMenu.tsx`) to name the downloaded file.
 *
 * Every registered language gets an entry — this is a small, closed,
 * one-to-one mapping (not a heuristic), so there's no meaningful
 * "language recognized but extension unknown" case to fall back on
 * separately from "language not recognized at all" (`resolveFileExtension`'s
 * own `.txt` fallback below already covers both).
 */
const FILE_EXTENSION_BY_LANGUAGE: Readonly<Record<string, string>> = {
  JavaScript: '.js',
  JSX: '.jsx',
  TypeScript: '.ts',
  TSX: '.tsx',
  JSON: '.json',
  CSS: '.css',
  HTML: '.html',
  Python: '.py',
  YAML: '.yaml',
  XML: '.xml',
  SQL: '.sql',
  Shell: '.sh',
  C: '.c',
  'C++': '.cpp',
  Java: '.java',
  Go: '.go',
  Rust: '.rs',
};

/**
 * Resolves a fenced code block's raw `CodeInfo` text to a file extension
 * (including the leading dot) for "Download code" — `.txt` when the info
 * string is empty, unrecognized, or matches a registered language with no
 * sensible extension (none currently exist, but the fallback still covers
 * that case rather than assuming the lookup can never miss). Matching
 * mirrors `fencedCodeLanguageLabel.ts`'s own `friendlyLanguageLabel` and
 * `codeFormatting.ts`'s own `resolveFormatterParser` exactly (same
 * normalization, same `LanguageDescription.matchLanguageName` call)
 * rather than re-implementing info-string parsing a third time.
 */
export function resolveFileExtension(rawInfo: string): string {
  const normalized = /\S*/.exec(rawInfo.trim())?.[0] ?? '';
  if (!normalized) {
    return '.txt';
  }

  const matched = LanguageDescription.matchLanguageName(
    fencedCodeLanguageDescriptions,
    normalized,
    true
  );
  if (!(matched instanceof LanguageDescription)) {
    return '.txt';
  }

  return FILE_EXTENSION_BY_LANGUAGE[matched.name] ?? '.txt';
}
