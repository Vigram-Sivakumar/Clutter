import type { Page } from '@core/vault/models/Page';
import type { EffectivePage } from '@core/application/page/EffectivePageState';
import { getPageIcon } from '@core/presentation/getPageIcon';
import { isToday } from '@shared/helpers/time';

export interface PageIdentityIcon {
  /** The page type's own canonical default (`getPageIcon`) — a daily note gets its calendar icon, never the plain note glyph. Always present, regardless of `emoji`. */
  readonly icon: 'note' | 'calendarNote' | 'calendarDot';
  /** The page's own assigned emoji override, `null` when none is assigned. */
  readonly emoji: string | null;
}

/**
 * The single shared source of truth for a resolved page's own identity
 * icon/emoji — used identically by `resolvePageEmbed.ts` (a note embed's
 * working header) and `resolveWikiLink.ts` (a resolved WikiLink's at-rest
 * form), so the two constructs can never silently diverge on "what icon
 * does this page show." Mirrors `AppIcon.tsx`'s own `icon`/`emoji` prop
 * pair (`shared/icon/AppIcon.tsx`) and `buildEntryPresentation.ts`'s own
 * identical composition for every other page-identity render site in the
 * app (sidebar rows, breadcrumbs) — reused as plain data here, not a new
 * icon vocabulary.
 *
 * `effective` is `EffectivePageState.getPage(page.id)` — session-wins-
 * over-committed (ADR-020's existing precedence, the same source
 * `markdown`/title-computation callers already read) — `undefined` when
 * no live session exists for this page, in which case both fields fall
 * back to `page`'s own durable values. `effective?.name` (not `page.name`)
 * feeds `isToday`, matching `buildEntryPresentation.ts`/
 * `buildBreadcrumbs.ts`'s own convention of keying `isToday` off the
 * *entry's* own raw name rather than a display-formatted title.
 */
export function resolvePageIdentityIcon(page: Page, effective: EffectivePage | undefined): PageIdentityIcon {
  const emoji = effective?.icon ?? page.metadata.icon;
  // Cast is safe: `page.type` is always `PageType` here (never the
  // `'folder' | 'tag'` extra members `getPageIcon` also accepts for its
  // other callers), so its own return type is always narrowed in
  // practice to exactly the two page-type branches — `'note'` or one of
  // the two calendar variants.
  const icon = getPageIcon(page.type, page.type === 'daily-note' && isToday(effective?.name ?? page.name)) as
    | 'note'
    | 'calendarNote'
    | 'calendarDot';
  return { icon, emoji };
}
