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
 * **No Back button, and deliberately no back-navigation mechanism of any
 * kind.** *Locked.* The language view has no way to return to the Actions
 * view short of closing the whole menu and reopening it — Escape and the
 * backdrop click both go straight to `onClose` (`Overlay`'s existing,
 * unmodified single-callback contract), the same as the Actions view
 * itself. Reopening always lands back on the Actions view (the `anchor`
 * effect below resets `view` on every fresh open), which is what makes
 * this an acceptable simplification rather than a dead end: going back
 * costs one click-to-close plus one click-to-reopen, not a rebuild of the
 * fence's language choice.
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

  // Every fresh open must start on the Actions view with an empty search
  // — `FencedCodeActionsMenu` itself never unmounts between opens (only
  // its `Overlay` does), so `view`/`query` would otherwise resume
  // wherever the previous open left off.
  //
  // **Deliberately reset here, during render, not in a `useEffect`.** An
  // effect-based reset (`useEffect(() => { if (anchor) setView('actions')
  // }, [anchor])`, this file's own earlier version) runs *after* React
  // has already committed and painted a frame with the stale `view` —
  // reopening the menu right after leaving it on the language view
  // visibly flashed the language picker for one frame before the effect
  // corrected it a moment later. This is React's own documented pattern
  // for "adjust state when a prop changes, no flash" instead: calling
  // `setState` unconditionally during render, guarded so it only fires on
  // the actual open transition, makes React re-render with the corrected
  // state *before* committing anything to the screen — no intermediate
  // frame with the old view is ever painted.
  // `wasOpen` is `useState`, not `useRef` — React's own rule against
  // reading/writing a ref during render (it isn't part of React's
  // render-phase state model, and can double-fire under Strict Mode's
  // deliberate double-invocation) is exactly why the sanctioned "adjust
  // state during render" pattern tracks the previous value as state.
  const [wasOpen, setWasOpen] = useState(anchor !== null);
  const isOpen = anchor !== null;
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen && view !== 'actions') {
      setView('actions');
    }
    if (isOpen && query !== '') {
      setQuery('');
    }
  }

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

  return (
    <Overlay
      open={anchor !== null}
      onClose={onClose}
      anchorRef={(anchor ?? { current: null }) as RefObject<HTMLElement>}
      side="bottom"
      alignment="end"
    >
      {view === 'actions' ? (
        <Menu size="medium">
          <MenuItem
            leading={<AppIcon icon="code" />}
            trailing={<AppIcon icon="chevronRight" />}
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
            <span className="fenced-code-language-picker__title">Change Language</span>
            <Button
              aria-label="Close"
              onClick={onClose}
              isIconOnly
              variant="ghost"
              interaction="subtle"
              size="small"
            >
              <AppIcon icon="dismiss" />
            </Button>
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
