import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import './CollectionEntry.css';
import { AppIcon, type SystemIcon } from '@shared/icon';
import { Checkbox } from '@components/checkbox/Checkbox';

export interface CollectionEntryProps extends HTMLAttributes<HTMLDivElement> {
  icon?: SystemIcon;
  emoji?: string;

  title?: string;
  description?: string;
  metadata?: ReactNode;

  isSelected?: boolean;

  isSelectable?: boolean;
  onSelectedChange?: (selected: boolean) => void;

  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export const CollectionEntry = forwardRef<HTMLDivElement, CollectionEntryProps>(
  function CollectionEntry(
    {
      icon,
      emoji,
      title,
      description,
      metadata,
      isSelectable = false,
      isSelected = false,
      onSelectedChange,
      onClick,
      className,
      ...props
    },
    ref
  ) {
    return (
      <div
        {...props}
        ref={ref}
        className={[
          'collection-entry',
          className,
          onClick && 'collection-entry--interactive',
          isSelectable && 'collection-entry--selectable',
          isSelected && 'collection-entry--selected',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onClick}
      >
        {(icon || emoji || isSelectable) && (
          <div className="collection-entry__leading">
            {(icon || emoji) && (
              <AppIcon
                className={
                  emoji ? 'collection-entry__emoji' : 'collection-entry__icon'
                }
                icon={icon}
                emoji={emoji}
              />
            )}

            {isSelectable && (
              <Checkbox
                isChecked={isSelected}
                onCheckedChange={onSelectedChange}
              />
            )}
          </div>
        )}

        <div className="collection-entry__content">
          <div className="collection-entry__primary">
            {title && <div className="collection-entry__title">{title}</div>}

            {description && (
              <div className="collection-entry__description">{description}</div>
            )}
          </div>

          {metadata && (
            <div className="collection-entry__metadata">{metadata}</div>
          )}
        </div>
      </div>
    );
  }
);

CollectionEntry.displayName = 'CollectionEntry';
