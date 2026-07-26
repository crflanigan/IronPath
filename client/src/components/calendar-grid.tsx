import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { Workout } from '@shared/schema';
import { generateWorkoutSchedule } from '@/lib/workout-data';
import { cn, formatLocalDate } from '@/lib/utils';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CalendarGridProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectDate: (date: string) => void;
  workouts: Workout[];
  selectedDate?: string | null;
}

export function CalendarGrid({
  currentDate,
  onDateChange,
  onSelectDate,
  workouts,
  selectedDate
}: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  // A `new Date()` built during render is a fresh object every time, so using
  // it as a memo dependency meant the 42-cell grid was rebuilt on every
  // render and the memo cached nothing. A day string is stable.
  const todayKey = new Date().toDateString();


  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();

    const days: {
      day: number;
      date: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }[] = [];

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      days.push({
        day,
        date: formatLocalDate(new Date(year, month - 1, day)),
        isCurrentMonth: false,
        isToday: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = formatLocalDate(date);
      const isToday = date.toDateString() === todayKey;

      days.push({
        day,
        date: dateString,
        isCurrentMonth: true,
        isToday,
      });
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        date: formatLocalDate(new Date(year, month + 1, day)),
        isCurrentMonth: false,
        isToday: false,
      });
    }

    return days;
  }, [year, month, todayKey]);

  const workoutSchedule = useMemo(
    () => generateWorkoutSchedule(year, month + 1),
    [year, month],
  );

  const getWorkoutForDate = (date: string) => {
    return workouts.find(w => w.date === date);
  };

  const getScheduledWorkoutForDate = (date: string) => {
    return workoutSchedule.find(w => w.date === date);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous month"
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {monthNames[month]} {year}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next month"
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1" data-tour="calendar">
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 p-2">
            {day}
          </div>
        ))}

        {calendarDays.map((dayData, index) => {
          const workout = getWorkoutForDate(dayData.date);
          const scheduledWorkout = getScheduledWorkoutForDate(dayData.date);
          const hasWorkout = workout || scheduledWorkout;

          const sharedClasses =
            'aspect-square w-full h-auto p-0 flex flex-col items-center justify-center gap-1 text-sm leading-tight rounded-lg';
          const isCompleted = workout?.completed || false;
          const isSelected = selectedDate === dayData.date;

          if (!dayData.isCurrentMonth) {
            return (
              <div
                key={index}
                className={`${sharedClasses} text-gray-400 dark:text-gray-600`}
              >
                <span className="text-base font-semibold leading-none">{dayData.day}</span>
              </div>
            );
          }

          if (hasWorkout) {
            return (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  sharedClasses,
                  'bg-white dark:bg-gray-800 border hover:shadow-md transition-shadow',
                  // A completed day is washed green, not just checked, so a
                  // month can be read at a glance instead of hunting for a
                  // 12px glyph cell by cell.
                  isCompleted &&
                    'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700',
                  // Selection must outrank the completed border, so it comes after.
                  isSelected
                    ? 'border-primary ring-2 ring-primary'
                    : !isCompleted && 'border-gray-200 dark:border-gray-700',
                  // Today is filled whether or not it is selected. It used to
                  // drop the fill the moment you selected it, which left the
                  // 📅 glyph as its only marker — and that glyph is now gone.
                  //
                  // `dark:bg-primary` is load-bearing: the base classes carry
                  // `dark:bg-gray-800`, and tailwind-merge keys variants
                  // separately, so a bare `bg-primary` never collides with it
                  // and loses the cascade. Without this, today is unmarked in
                  // dark mode.
                  dayData.isToday &&
                    'bg-primary dark:bg-primary text-white hover:bg-primary/90',
                )}
                data-today={dayData.isToday || undefined}
                onClick={() => onSelectDate(dayData.date)}
              >
                <div className="text-base font-semibold leading-none">{dayData.day}</div>
                {isCompleted && <div className="text-xs">✅</div>}
              </Button>
            );
          }

          return (
            <Button
              key={index}
              variant="ghost"
              className={cn(
                sharedClasses,
                dayData.isToday
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : '',
                isSelected && 'border-2 border-primary'
              )}
              data-today={dayData.isToday || undefined}
              onClick={() => onSelectDate(dayData.date)}
            >
              <span className="text-base font-semibold leading-none">{dayData.day}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
