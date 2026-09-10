import type { MutableRefObject, RefObject } from 'react';
import { useMemo, useRef } from 'react';
import { LanguageDescription } from '@codemirror/language';

import { Overlay } from '@components/overlay/Overlay';
import { OverflowMenuBody } from '@components/menu/OverflowMenu';
import type { OverflowMenuItemConfig } from '@components/menu/OverflowMenu';

import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

export interface FencedCodeActionsMenuAnchor {
  readonly current: HTMLElement;
}

const LANGUAGE_ITEM_PREFIX = 'language:';

export interface FencedCodeActionsMenuProps {
  readonly anchor: FencedCodeActionsMenuAnchor | null;
  readonly onClose: () => void;
  /** The block's current raw `CodeInfo` text (`''`/`undefined` when there's none) — used only to mark the matching submenu entry with a checkmark; unrelated to what gets written on selection. */
  readonly currentRawInfo?: string;
  /** Rewrites only the block's info string to `languageName` (one of `fencedCodeLanguageDescriptions`' own canonical `name`s, lowercased) — never touches the code content. See `fencedCodeInfoRange.ts`'s own doc comment for the exact range this replaces. */
  readonly onChangeLanguage?: (languageName: string) => void;
  /** Deletes the entire fenced code block — opening marker, all content, closing marker. See `fencedCodeRemovalRange.ts`'s own doc comment for the exact range/blank-line rule. Plain CM6 undo restores it. */
  readonly onRemove?: () => void;
}

/**
 * The fenced-code-block "More actions" menu — deliberately small, same
 * shape as `NoteEmbedMoreActions.tsx` (`Overlay` + `OverflowMenuBody`,
 * reused unmodified), anchored to `FencedCodeActionsButtonWidget.ts`'s
 * raw CM6 DOM trigger via the same `{current: HTMLElement}` bridging
 * every other "More actions" menu in this editor already uses.
 *
 * **Copy and Format keep their own dedicated, always-visible buttons and
 * existing behavior** — this menu is deliberately for secondary/
 * destructive actions only, not a replacement for either.
 *
 * **Change Language reuses `fencedCodeLanguageDescriptions` as its own
 * single source of truth** (`OverflowMenuItemConfig.submenu`, the same
 * native submenu mechanism `OverflowMenu.tsx` already provides for
 * "Copy path" — no second menu system, no free-text input). The currently
 * selected language gets `OverflowMenuSubmenuItemConfig.selected: true`
 * (a small, generic addition to that shared type, not a fenced-code-
 * specific hack), matched via the exact same
 * `LanguageDescription.matchLanguageName` lookup
 * `fencedCodeLanguageLabel.ts`/`codeFormatting.ts` already use — one
 * matching rule, not a second copy of it.
 */
export function FencedCodeActionsMenu({
  anchor,
  onClose,
  currentRawInfo,
  onChangeLanguage,
  onRemove,
}: FencedCodeActionsMenuProps) {
  const suppressReturnFocusRef = useRef(false);

  const items = useMemo<OverflowMenuItemConfig[]>(() => {
    const normalized = /\S*/.exec((currentRawInfo ?? '').trim())?.[0] ?? '';
    const matched = normalized
      ? LanguageDescription.matchLanguageName(fencedCodeLanguageDescriptions, normalized, true)
      : null;
    const currentName = matched instanceof LanguageDescription ? matched.name : null;

    return [
      {
        id: 'change-language',
        label: 'Change Language',
        icon: 'code',
        submenu: fencedCodeLanguageDescriptions.map((description) => ({
          id: `${LANGUAGE_ITEM_PREFIX}${description.name}`,
          label: description.name,
          selected: description.name === currentName,
        })),
      },
      { id: 'remove', label: 'Remove', icon: 'trash', separatorBefore: true },
    ];
  }, [currentRawInfo]);

  function handleSelect(id: string) {
    if (id === 'remove') {
      onRemove?.();
    } else if (id.startsWith(LANGUAGE_ITEM_PREFIX)) {
      onChangeLanguage?.(id.slice(LANGUAGE_ITEM_PREFIX.length));
    }
  }

  return (
    <Overlay
      open={anchor !== null}
      onClose={onClose}
      anchorRef={(anchor ?? { current: null }) as RefObject<HTMLElement>}
      side="bottom"
      alignment="end"
    >
      <OverflowMenuBody
        items={items}
        size="small"
        onSelect={handleSelect}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
        suppressReturnFocusRef={suppressReturnFocusRef as MutableRefObject<boolean>}
      />
    </Overlay>
  );
}
