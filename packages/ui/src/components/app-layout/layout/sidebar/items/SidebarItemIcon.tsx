import { ReactNode, memo } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { ChevronRight } from '../../../../../icons';
import { TertiaryButton } from '../../../../ui-buttons';
import { getNoteIcon, getFolderIcon } from '../../../../../utils/itemIcons';
import { sidebarStyles } from '../config/sidebarConfig';
import { animations } from '../../../../../tokens/animations';

/**
 * SidebarItemIcon
 * Handles icon/emoji rendering for sidebar items
 *
 * Responsibilities:
 * - Render appropriate icon based on variant (note/folder/tag/header/group)
 * - Handle icon/emoji clicks for emoji picker
 * - Handle chevron swap on hover for folders (CSS-driven)
 * - Daily note icon selection
 * - Folder open/closed state icons
 *
 * NOT responsible for:
 * - Emoji picker logic (passed through onClick)
 * - Action visibility (controlled by parent)
 */

interface SidebarItemIconProps {
  // Core
  variant: 'note' | 'folder' | 'tag' | 'header' | 'group';
  icon?: string | ReactNode; // emoji string or React icon component

  // Visual state
  isSelected?: boolean;
  isOpen?: boolean; // For folders - whether expanded
  labelColor?: string; // Optional color override (e.g., calendarAccent for today's note)

  // Note-specific
  hasContent?: boolean; // For notes - whether note has editor content
  dailyNoteDate?: string | null; // For notes - if it's a daily note

  // Folder-specific
  folderId?: string;
  showChevronOnHover?: boolean; // For folders with toggle - show chevron on hover
  onToggle?: () => void; // Click chevron to expand/collapse

  // Emoji picker
  id: string;
  onEmojiClick?: (_id: string, _buttonElement: HTMLButtonElement) => void;
}

export const SidebarItemIcon = memo(
  ({
    variant,
    icon,
    isSelected = false,
    isOpen = false,
    labelColor,
    hasContent = true,
    dailyNoteDate,
    folderId,
    showChevronOnHover = false,
    onToggle,
    id,
    onEmojiClick,
  }: SidebarItemIconProps) => {
    const { colors } = useTheme();

    // Headers can have optional icons (e.g., All Tasks with CheckSquare)
    // Wrap in TertiaryButton for consistent 20x20px sizing with items
    if (variant === 'header') {
      if (icon) {
        return <TertiaryButton icon={icon} size="xs" disabled disabledNoFade />;
      }
      return null;
    }

    // Groups can have optional icons but they're not interactive
    if (variant === 'group') {
      if (icon) {
        return <>{icon}</>;
      }
      return null;
    }

    // Tags don't have icons (use colored pill instead)
    if (variant === 'tag') {
      return null;
    }

    // Notes: Show note icon (blank/filled) or daily note calendar icon
    if (variant === 'note') {
      // Use labelColor (e.g., calendarAccent for today's note) if provided, otherwise use default colors
      const iconColor =
        labelColor ||
        (isSelected ? colors.text.default : colors.text.secondary);
      const noteIcon = getNoteIcon({
        emoji: typeof icon === 'string' ? icon : undefined,
        dailyNoteDate,
        hasContent,
        size: 16,
        color: iconColor,
      });

      return (
        <TertiaryButton
          icon={noteIcon}
          onClick={(e) => {
            e.stopPropagation();
            if (onEmojiClick) {
              onEmojiClick(id, e.currentTarget as HTMLButtonElement);
            }
          }}
          size="xs"
        />
      );
    }

    // Folders: Icon/emoji with optional chevron swap on hover
    if (variant === 'folder') {
      // Use labelColor (e.g., calendarAccent for current year/month) if provided, otherwise use default colors
      const iconColor =
        labelColor ||
        (isSelected ? colors.text.default : colors.text.secondary);
      const folderIcon = getFolderIcon({
        folderId: folderId || id,
        emoji: typeof icon === 'string' ? icon : undefined,
        isOpen,
        size: 16,
        color: iconColor,
      });

      // Folder with toggle: Show chevron on hover (replaces icon)
      if (showChevronOnHover && onToggle) {
        return (
          <div
            className={sidebarStyles.classes.iconWrapper}
            style={{
              position: 'relative',
              width: '20px',
              height: '20px',
              flexShrink: 0,
            }}
          >
            {/* Icon - always rendered, CSS controls visibility (hidden on hover) */}
            <div
              className={sidebarStyles.classes.icon}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 1,
                transition: animations.transition.opacity,
              }}
            >
              <TertiaryButton
                icon={folderIcon}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEmojiClick) {
                    onEmojiClick(id, e.currentTarget as HTMLButtonElement);
                  }
                }}
                disabled={!onEmojiClick}
                disabledNoFade={!onEmojiClick}
                size="xs"
              />
            </div>

            {/* Chevron - always rendered, CSS controls visibility (shown on hover) */}
            <div
              className={sidebarStyles.classes.chevronLeft}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: animations.transition.opacity,
              }}
            >
              <TertiaryButton
                icon={
                  <ChevronRight
                    size={16}
                    style={{
                      transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: animations.transition.transform,
                    }}
                  />
                }
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle();
                }}
                size="xs"
              />
            </div>
          </div>
        );
      }

      // Folder without toggle: Just show icon
      if (onEmojiClick) {
        return (
          <TertiaryButton
            icon={folderIcon}
            onClick={(e) => {
              e.stopPropagation();
              onEmojiClick(id, e.currentTarget as HTMLButtonElement);
            }}
            size="xs"
          />
        );
      }

      return (
        <TertiaryButton
          icon={folderIcon}
          onClick={(e) => e.stopPropagation()}
          disabled={true}
          disabledNoFade={true}
          size="xs"
        />
      );
    }

    return null;
  }
);

SidebarItemIcon.displayName = 'SidebarItemIcon';
