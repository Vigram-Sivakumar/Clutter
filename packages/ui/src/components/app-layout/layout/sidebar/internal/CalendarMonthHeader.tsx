import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from '../../../../../icons';
import { TertiaryButton } from '../../../../ui-buttons';
import { sidebarLayout } from '../../../../../tokens/sidebar';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing } from '../../../../../tokens/spacing';

interface CalendarMonthHeaderProps {
  currentWeekStart: Date;
  onWeekChange: (newWeekStart: Date) => void;
  onDateSelect?: (date: Date) => void;
}

export const CalendarMonthHeader = ({ currentWeekStart, onWeekChange, onDateSelect }: CalendarMonthHeaderProps) => {
  const { colors } = useTheme();

  // Calculate month and year from the current week
  // Use Thursday (4th day) to determine the month - ISO week date standard
  // This ensures the displayed month contains the majority of days in the visible week
  const displayDate = useMemo(() => {
    const thursday = new Date(currentWeekStart);
    thursday.setDate(thursday.getDate() + 4); // Thursday (4th day of week, 0=Sunday)
    return thursday;
  }, [currentWeekStart]);

  const month = displayDate.toLocaleString('default', { month: 'long' });
  const year = displayDate.getFullYear();

  const handlePreviousWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setHours(0, 0, 0, 0); // Normalize
    newWeekStart.setDate(newWeekStart.getDate() - 7); // Go back 7 days
    onWeekChange(newWeekStart);
  };

  const handleNextWeek = () => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setHours(0, 0, 0, 0); // Normalize
    newWeekStart.setDate(newWeekStart.getDate() + 7); // Go forward 7 days
    onWeekChange(newWeekStart);
  };

  const handleCurrentDateClick = () => {
    const today = new Date();
    // Normalize to start of day
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek); // Go back to Sunday
    onWeekChange(startOfWeek);
    // Also select today's date
    if (onDateSelect) {
      onDateSelect(today);
    }
  };

  return (
    <div
      style={{
        height: sidebarLayout.itemHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: sidebarLayout.itemContentGap,
        paddingLeft: spacing['4'],
        paddingRight: spacing['2'],
      }}
    >
        {/* Month and Year */}
        <div
          style={{
            fontSize: '14px',
            fontWeight: sidebarLayout.headerFontWeight,
            letterSpacing: sidebarLayout.headerLetterSpacing,
            color: colors.text.default,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {month} <span style={{ color: colors.text.placeholder }}>{year}</span>
        </div>

        {/* Navigation buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: sidebarLayout.itemActionsGap,
          }}
        >
        {/* Previous week - ChevronLeft icon */}
        <TertiaryButton
          icon={<ChevronLeft size={16} />}
          onClick={handlePreviousWeek}
          size="small"
        />

        {/* Next week - ChevronRight icon */}
        <TertiaryButton
          icon={<ChevronRight size={16} />}
          onClick={handleNextWeek}
          size="small"
        />

          {/* Today button - Calendar icon */}
          <TertiaryButton
            icon={<Calendar size={16} />}
            onClick={handleCurrentDateClick}
            size="small"
          />
        </div>
    </div>
  );
};

