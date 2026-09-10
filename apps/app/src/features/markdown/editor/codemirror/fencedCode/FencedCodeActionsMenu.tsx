import type { KeyboardEvent, RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LanguageDescription } from '@codemirror/language';

import { Overlay } from '@components/overlay/Overlay';
import { Menu } from '@components/menu/Menu';
import { MenuItem } from '@components/menu/MenuItem';
import { Search } from '@components/search/Search';
import { Button } from '@components/button/Button';
import { AppIcon } from '@shared/icon';
import { useMenuContext } from '@components/menu/Menu.context';

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
 * **Change Language swaps this same `Menu`'s content in place — it does
 * NOT open a nested submenu/second `Overlay`, and it is NOT a separate,
 * custom menu container either.** *Locked, replaces both the original
 * `OverflowMenuBody`+submenu design and this file's own first view-swap
 * pass (which built a standalone `.fenced-code-language-picker` div
 * instead of reusing `Menu`).* One shared `<Menu size="medium">` renders
 * either the Actions items or the language list — both views get
 * identical container styling, sizing, border/radius/shadow, and
 * keyboard navigation for free, and `MenuItem` (not a hand-rolled
 * `Entry` + manual `forceHover`/`onMouseEnter` wiring) drives every row
 * in both views identically.
 *
 * **`Menu`'s own `autoFocus` prop (added for this feature — see its own
 * doc comment) is what makes this possible.** `Menu` always focuses its
 * own container on mount; a search input needs that focus instead. This
 * is investigated and confirmed as the *only* actual conflict — the
 * keyboard/roving-active-item system (`useMenuKeyboard`, `MenuContext`)
 * and `MenuItem` themselves have no assumption baked in about what holds
 * real DOM focus, confirmed by reading `Menu.tsx`/`MenuItem.tsx`/
 * `useMenuKeyboard.ts` directly before this pass, not assumed. With
 * `autoFocus={false}` and `Search` rendered as a direct DOM child of
 * `Menu`'s own container, keydown events bubble to `Menu`'s own
 * `onKeyDown={keyboard.handleKeyDown}` natively — no manual
 * event-forwarding needed (the standalone-container version of this file
 * had to do exactly that manually, precisely because it wasn't a `Menu`
 * descendant).
 *
 * **`aria-activedescendant` follows real DOM focus, not blindly copied
 * onto the `Search` input.** `Menu`'s own container still carries its own
 * `aria-activedescendant` (unconditionally, unchanged) — but since real
 * focus lives on `Search` while the language view is showing, `Search`
 * itself also carries `aria-activedescendant` pointing at the same
 * `activeId`, matching the exact convention `FolderPicker.tsx` already
 * established for this precise situation (a focused text input owning a
 * virtually-navigated list below it) — not a newly-invented pattern.
 *
 * **`useMenuContext()` (the same hook `MenuItem` itself uses internally)
 * is called directly by `LanguagePickerContent` below** — the only way to
 * reach `Menu`'s own `{activeId, setActiveId}` from outside `MenuItem` is
 * to be a React descendant of `Menu`'s own `MenuContext.Provider`, which
 * requires this content to render *inside* `<Menu>`, not the other way
 * around; this is why the language view's content is its own small
 * component rather than inline JSX in `FencedCodeActionsMenu` itself.
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
 * view short of closing the whole menu (Escape, the backdrop, or the
 * dismiss button in the language view's own header) and reopening it —
 * `Overlay`'s `onClose` always fully closes, the same for both views.
 * Reopening always lands back on the Actions view (see the render-phase
 * reset below), which is what makes this an acceptable simplification:
 * going back costs one close-plus-reopen, not a rebuilt language choice.
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
      <Menu size="medium" autoFocus={view === 'actions'}>
        {view === 'actions' ? (
          <>
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
          </>
        ) : (
          <LanguagePickerContent
            searchRef={searchRef}
            query={query}
            onQueryChange={setQuery}
            filteredDescriptions={filteredDescriptions}
            currentName={currentName}
            onSelect={selectLanguage}
            onClose={onClose}
          />
        )}
      </Menu>
    </Overlay>
  );
}

interface LanguagePickerContentProps {
  readonly searchRef: RefObject<HTMLInputElement>;
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly filteredDescriptions: readonly LanguageDescription[];
  readonly currentName: string | null;
  readonly onSelect: (name: string) => void;
  readonly onClose: () => void;
}

/**
 * Rendered as `Menu`'s own child — `useMenuContext()` (the same hook
 * `MenuItem` itself calls) is only reachable from inside `Menu`'s own
 * `MenuContext.Provider`, which is why this can't be inlined into
 * `FencedCodeActionsMenu`'s own render body one level up.
 */
function LanguagePickerContent({
  searchRef,
  query,
  onQueryChange,
  filteredDescriptions,
  currentName,
  onSelect,
  onClose,
}: LanguagePickerContentProps) {
  const { activeId, setActiveId } = useMenuContext();

  // Highlights the first result as the active (keyboard-navigable) row
  // whenever the filtered set changes — the same behavior
  // `FolderPicker.tsx` establishes for its own search results, reused
  // here for consistency, not coincidence.
  useEffect(() => {
    setActiveId(filteredDescriptions[0]?.name);
    // setActiveId has a stable identity (useState setter) and is
    // deliberately omitted — only a real change to the filtered set
    // should reset which row is highlighted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredDescriptions]);

  return (
    <>
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
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          // `useMenuKeyboard` treats Space as "activate the current
          // item" — correct for a non-text-input menu, but this input
          // must keep Space as a literal character (e.g. searching
          // "Objective C"). Stopping propagation here keeps it from
          // reaching `Menu`'s own `onKeyDown` (a sibling/ancestor
          // synthetic listener); every other key (ArrowUp/Down/Home/
          // End/Enter) is deliberately left to bubble there unchanged —
          // `Search` is a real DOM child of `Menu`'s own container, so
          // native bubbling delivers them without any manual forwarding.
          if (event.key === ' ') {
            event.stopPropagation();
          }
        }}
        // `Menu`'s own container also carries `aria-activedescendant`
        // unconditionally (unchanged) — but real DOM focus lives here
        // while this view is showing, so this input carries it too,
        // matching `FolderPicker.tsx`'s own established convention for
        // exactly this shape (a focused text input virtually owning a
        // list below it), not a newly-invented pattern.
        aria-activedescendant={activeId}
        placeholder="Search languages"
      />

      {filteredDescriptions.map((description) => (
        <MenuItem
          key={description.name}
          id={description.name}
          selected={description.name === currentName}
          onClick={() => onSelect(description.name)}
        >
          {description.name}
        </MenuItem>
      ))}
      {filteredDescriptions.length === 0 && (
        <div className="fenced-code-language-picker__empty">No matching languages</div>
      )}
    </>
  );
}
