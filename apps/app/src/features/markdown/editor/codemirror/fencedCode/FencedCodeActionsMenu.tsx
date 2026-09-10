import type { RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LanguageDescription } from '@codemirror/language';

import { Overlay } from '@components/overlay/Overlay';
import { Menu } from '@components/menu/Menu';
import { MenuItem } from '@components/menu/MenuItem';
import { Entry } from '@components/entry/Entry';
import { Search } from '@components/search/Search';
import { Button } from '@components/button/Button';
import { AppIcon } from '@shared/icon';
import { useMenuKeyboard } from '@components/menu/useMenuKeyboard';

import { fencedCodeLanguageDescriptions } from './fencedCodeLanguages';

import './FencedCodeActionsMenu.css';

export interface FencedCodeActionsMenuAnchor {
  readonly current: HTMLElement;
}

export interface FencedCodeActionsMenuProps {
  readonly anchor: FencedCodeActionsMenuAnchor | null;
  readonly onClose: () => void;
  /** The block's current raw `CodeInfo` text (`''`/`undefined` when there's none) — used only to mark the matching language as currently selected. */
  readonly currentRawInfo?: string;
  /** Rewrites only the block's info string to `languageName` (one of `fencedCodeLanguageDescriptions`' own canonical `name`s, lowercased) — never touches the code content. See `fencedCodeInfoRange.ts`'s own doc comment for the exact range this replaces. */
  readonly onChangeLanguage?: (languageName: string) => void;
  /** Deletes the entire fenced code block — opening marker, all content, closing marker. See `fencedCodeRemovalRange.ts`'s own doc comment for the exact range/blank-line rule. Plain CM6 undo restores it. */
  readonly onRemove?: () => void;
}

type MenuView = 'actions' | 'language';

/**
 * The fenced-code-block "More actions" menu.
 *
 * **Change Language swaps this same Overlay's content in place — it does
 * NOT open a nested submenu/second Overlay.** *Locked, replaces the prior
 * `OverflowMenuBody`+submenu design.* The submenu mechanism
 * (`OverflowSubmenuTrigger` in `OverflowMenu.tsx`) is a real, second,
 * independently-anchored `Overlay`, which is the correct shape for a
 * short, static leaf list ("Copy path" → 2 options) but doesn't scale to
 * a list that grows into the dozens and needs search — a hover-opened
 * popout has no room for a search input and no natural "how many can fit"
 * ceiling. Deliberately NOT built on `OverflowMenuBody`/`OverflowMenu` at
 * all (this menu only ever has two top-level items, so nothing about the
 * generic item-config/submenu machinery is actually needed) — `Menu`/
 * `MenuItem` are composed directly instead, exactly as they already are
 * inside `OverflowMenuBody` itself, just without the layer that only
 * exists to support hover-opened submenus.
 *
 * **The language view is `FolderPicker.tsx`'s pattern, reused directly,
 * not reinvented**: a `Search` input holding real DOM focus, a plain
 * `useMenuKeyboard(listRef)` (not a real `<Menu>`, which would fight the
 * search input for focus-on-mount the same way `FolderPicker.tsx`'s own
 * doc comment already explains), and `Entry role="menuitem"` rows with
 * `forceHover` standing in for the "keyboard-active row looks hovered"
 * convention `MenuItem` itself uses. Verified against `FolderPicker.tsx`
 * before writing this rather than assumed.
 *
 * **Search matches against `LanguageDescription.alias` — the exact array
 * `codeLanguages`' own fence-info resolution uses — not a second,
 * hand-maintained keyword list.** `LanguageDescription.of` already folds
 * the lowercased canonical name into its own `alias` array (confirmed
 * against the installed `@codemirror/language` source, already cited in
 * `fencedCodeLanguages.ts`), so matching only against `alias` — never
 * `name` separately — covers both without duplicating the check. This is
 * why `js` finds JavaScript (name aliased) and JSX (its own `jsx` alias)
 * with the exact same query.
 *
 * **Escape and the backdrop share one `onClose`, which goes back before it
 * closes — no change to `Overlay`/`useEscape` needed.** Both already funnel
 * into a single `onClose` prop on `Overlay`; `handleRequestClose` below
 * checks the current view first, so the *first* Escape (or backdrop click)
 * while the language view is open returns to the Actions view, and only a
 * second one (already back on the Actions view) actually closes the menu —
 * consistent with `Overlay`'s existing single-callback contract, not a
 * second dismissal mechanism layered on top of it.
 */
export function FencedCodeActionsMenu({
  anchor,
  onClose,
  currentRawInfo,
  onChangeLanguage,
  onRemove,
}: FencedCodeActionsMenuProps) {
  const [view, setView] = useState<MenuView>('actions');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const keyboard = useMenuKeyboard(listRef);

  // Every fresh open starts on the Actions view with an empty search —
  // `FencedCodeActionsMenu` itself never unmounts between opens (only its
  // `Overlay` does), so without this a reopen would silently resume
  // wherever the previous open left off.
  useEffect(() => {
    if (anchor) {
      setView('actions');
      setQuery('');
    }
  }, [anchor]);

  useEffect(() => {
    if (view === 'language') {
      searchRef.current?.focus();
    }
  }, [view]);

  const normalized = /\S*/.exec((currentRawInfo ?? '').trim())?.[0] ?? '';
  const matched = normalized
    ? LanguageDescription.matchLanguageName(fencedCodeLanguageDescriptions, normalized, true)
    : null;
  const currentName = matched instanceof LanguageDescription ? matched.name : null;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredDescriptions = useMemo(() => {
    if (!normalizedQuery) {
      return fencedCodeLanguageDescriptions;
    }
    return fencedCodeLanguageDescriptions.filter((description) =>
      description.alias.some((alias) => alias.includes(normalizedQuery))
    );
  }, [normalizedQuery]);

  useEffect(() => {
    keyboard.setActiveId(filteredDescriptions[0]?.name);
    // keyboard.setActiveId has a stable identity (useState setter) and is
    // deliberately omitted — only a real change to the filtered set should
    // reset which row is highlighted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDescriptions]);

  function selectLanguage(name: string) {
    onChangeLanguage?.(name);
    onClose();
  }

  function handleRequestClose() {
    if (view === 'language') {
      setView('actions');
      return;
    }
    onClose();
  }

  return (
    <Overlay
      open={anchor !== null}
      onClose={handleRequestClose}
      anchorRef={(anchor ?? { current: null }) as RefObject<HTMLElement>}
      side="bottom"
      alignment="end"
    >
      {view === 'actions' ? (
        <Menu size="small">
          <MenuItem
            leading={<AppIcon icon="code" />}
            onClick={(event) => {
              event.stopPropagation();
              setView('language');
            }}
          >
            Change Language
          </MenuItem>
          <div className="menu__divider" role="separator" />
          <MenuItem
            leading={<AppIcon icon="trash" />}
            onClick={(event) => {
              event.stopPropagation();
              onRemove?.();
              onClose();
            }}
          >
            Remove
          </MenuItem>
        </Menu>
      ) : (
        <div className="fenced-code-language-picker">
          <div className="fenced-code-language-picker__header">
            <Button
              aria-label="Back to actions"
              onClick={() => setView('actions')}
              isIconOnly
              variant="ghost"
              interaction="subtle"
              size="small"
            >
              <AppIcon icon="chevronLeft" />
            </Button>
            <span className="fenced-code-language-picker__title">Change Language</span>
          </div>

          <Search
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === ' ') {
                return;
              }
              keyboard.handleKeyDown(event as unknown as React.KeyboardEvent<HTMLDivElement>);
            }}
            aria-activedescendant={keyboard.activeId}
            placeholder="Search languages"
          />

          <div className="fenced-code-language-picker__list" ref={listRef}>
            {filteredDescriptions.map((description) => (
              <Entry
                key={description.name}
                id={description.name}
                role="menuitem"
                tabIndex={-1}
                selected={description.name === currentName}
                forceHover={keyboard.activeId === description.name}
                onMouseEnter={() => keyboard.setActiveId(description.name)}
                onClick={() => selectLanguage(description.name)}
              >
                {description.name}
              </Entry>
            ))}
            {filteredDescriptions.length === 0 && (
              <div className="fenced-code-language-picker__empty">No matching languages</div>
            )}
          </div>
        </div>
      )}
    </Overlay>
  );
}
