import { useMemo } from 'react';
import { useTheme } from '../../../../../hooks/useTheme';
import { spacing } from '../../../../../tokens/spacing';
import { radius } from '../../../../../tokens/radius';


interface CalendarDateGridProps {
  view?: 'week' | 'month';
  weekStart: Date; // Start of the week to display
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
}

export const CalendarDateGrid = ({
  view: _view = 'week', // Reserved for future month view implementation
  weekStart,
  onDateClick,
  selectedDate,
}: CalendarDateGridProps) => {
  const { colors } = useTheme();

  // Get today at start of day (normalized)
  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  // Calculate week days based on the provided weekStart
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    });
  }, [weekStart]);

  // Check if two dates are the same day
  const isSameDay = (date1: Date, date2: Date | undefined) => {
    if (!date2) return false;
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const handleDateClick = (date: Date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing['0'], // Gap between weekday headers and date grid
      }}
    >
      {/* Weekday Headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: spacing['2'],
          padding: spacing['2'],
        }}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
          <div
            key={i}
            style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 500,
              color: colors.text.secondary,
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Date Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: spacing['2'],
          backgroundColor: colors.background.tertiary,
          padding: spacing['4'],
          borderRadius: radius['6'], // 6px radius for weekly wrapper
        }}
      >
      {weekDays.map((date, index) => {
        const isToday = isSameDay(date, today);
        const isSelected = isSameDay(date, selectedDate);
        // Use Thursday (4th day) to determine the "current" month - ISO week date standard
        const thursday = new Date(weekStart);
        thursday.setDate(thursday.getDate() + 4);
        const currentMonth = thursday.getMonth();
        const isCurrentMonth = date.getMonth() === currentMonth;

        return (
          <button
            key={index}
            onClick={() => handleDateClick(date)}
            style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: isToday || isSelected ? 600 : 400,
              color: isSelected
                ? '#FFFFFF'
                : isToday
                ? '#FFFFFF'
                : isCurrentMonth
                ? colors.text.default
                : colors.text.tertiary,
              backgroundColor: isSelected
                ? colors.semantic.calendarAccent
                : isToday
                ? colors.semantic.calendarAccent
                : 'transparent',
              border: '1px solid transparent',
              borderRadius: radius['6'],
              cursor: 'pointer',
              transition: 'all 150ms ease',
              padding: '4px 0',
              boxSizing: 'border-box',
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !isToday) {
                e.currentTarget.style.backgroundColor = colors.background.hover;
              } else {
                e.currentTarget.style.backgroundColor = colors.semantic.calendarAccent;
              }
            }}
            onMouseLeave={(e) => {
              if (isSelected || isToday) {
                e.currentTarget.style.backgroundColor = colors.semantic.calendarAccent;
              } else {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {date.getDate()}
          </button>
        );
      })}
      </div>
    </div>
  );
};

