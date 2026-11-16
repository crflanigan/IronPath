import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import type { Workout } from '@shared/schema';
import { cn, formatLocalDate } from '@/lib/utils';
import { isSameMonth } from '@/lib/calendar-position';

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
  /** `Date#getDay()` numbers. Days outside it are drawn as rest days. */
  trainingDays?: number[];
}

export function CalendarGrid({
  currentDate,
  onDateChange,
  onSelectDate,
  workouts,
  selectedDate,
  trainingDays
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

    // Pad out to a whole week, not to a fixed six rows.
    //
    // This used to be `42 - days.length`, so every month rendered six rows
    // whether it needed them or not. 19 of the 24 months in 2026-27 have a
    // sixth row containing nothing but next-month filler, and February 2026
    // — which starts on a Sunday and has 28 days — rendered two such rows.
    // Cells are `aspect-square`, so each one costs a full cell of height on
    // the page above the fold.
    const remainingDays = (7 - (days.length % 7)) % 7;
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

  const getWorkoutForDate = (date: string) => {
    return workouts.find(w => w.date === date);
  };

  const showingCurrentMonth = isSameMonth(currentDate, new Date());

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month + (direction === 'next' ? 1 : -1));
    onDateChange(newDate);
  };

  return (
    <div className="rounded-2xl border border-gray-200/80 bg-card p-4 shadow-card dark:border-white/[0.06]">
      <div className="mb-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Previous month"
          onClick={() => navigateMonth('prev')}
          className="h-10 w-10 rounded-full p-0 text-gray-500 dark:text-gray-400"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {monthNames[month]} <span className="font-medium text-gray-400 dark:text-gray-500">{year}</span>
          </h2>
          {/*
            * The way home.
            *
            * There was none: once you had browsed to June, the only route back
            * was tapping the arrow the same number of times. Hidden while the
            * current month is on screen, so it is not a permanent control that
            * does nothing most of the time.
            */}
          {!showingCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const now = new Date();
                onDateChange(now);
                onSelectDate(formatLocalDate(now));
              }}
              className="mt-0.5 h-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/15 hover:text-primary"
            >
              Today
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Next month"
          onClick={() => navigateMonth('next')}
          className="h-10 w-10 rounded-full p-0 text-gray-500 dark:text-gray-400"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1" data-tour="calendar">
        {daysOfWeek.map(day => (
          <div key={day} className="eyebrow pb-1 pt-2 text-center !tracking-[0.08em]">
            {day}
          </div>
        ))}

        {calendarDays.map((dayData, index) => {
          const workout = getWorkoutForDate(dayData.date);
          const isCompleted = workout?.completed || false;
          const isSelected = selectedDate === dayData.date;
          const inProgress = Boolean(workout) && !isCompleted;
          // The grid starts on Sunday, so the column is the weekday. A day
          // with something logged is never drawn as rest, whatever the plan.
          const isRest = !workout && trainingDays !== undefined && !trainingDays.includes(index % 7);

          /*
           * A month of circles rather than a month of boxes.
           *
           * Every day used to be a bordered white tile, so the grid was 30
           * identical rectangles and the days that mattered had to shout over
           * them with a green wash and an emoji. With the tiles gone the page
           * is quiet by default and three marks carry everything: a soft fill
           * for a day you trained, the brand fill for today, a ring for the
           * day you are looking at.
           */
          const sharedClasses =
            'relative aspect-square w-full h-auto p-0 flex flex-col items-center justify-center gap-0.5 text-sm leading-tight rounded-full';

          if (!dayData.isCurrentMonth) {
            return (
              <div
                key={index}
                className={`${sharedClasses} text-gray-300 dark:text-gray-700`}
              >
                <span className="nums text-[15px] font-medium leading-none">{dayData.day}</span>
              </div>
            );
          }

          return (
            <Button
              key={index}
              variant="ghost"
              className={cn(
                sharedClasses,
                'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/5',
                isRest && 'text-gray-400 dark:text-gray-500',
                isCompleted &&
                  'bg-primary/[0.13] text-primary hover:bg-primary/20 dark:bg-primary/[0.18] dark:text-primary dark:hover:bg-primary/25',
                // Today is filled whether or not it is selected or completed.
                // `dark:bg-primary` stays explicit: tailwind-merge keys
                // variants separately, so a bare `bg-primary` would not
                // displace a dark-mode background set earlier in this list.
                dayData.isToday &&
                  'bg-primary dark:bg-primary bg-brand text-primary-foreground shadow-glow hover:brightness-110 dark:text-primary-foreground',
                isSelected &&
                  'ring-2 ring-primary ring-offset-2 ring-offset-card',
              )}
              data-today={dayData.isToday || undefined}
              data-rest={isRest || undefined}
              data-completed={isCompleted || undefined}
              onClick={() => onSelectDate(dayData.date)}
            >
              <span className="nums text-[15px] font-semibold leading-none">{dayData.day}</span>
              {isCompleted && <Check className="!size-3" strokeWidth={3.5} aria-hidden="true" />}
              {inProgress && (
                <span
                  aria-hidden="true"
                  className={cn(
                    'h-1 w-1 rounded-full',
                    dayData.isToday ? 'bg-white/90' : 'bg-amber-500',
                  )}
                />
              )}
            </Button>
          );
        })}
      </div>

      {/* Two marks to explain, drawn exactly as the grid draws them — a
          legend that shows the real mark beats one that describes it. */}
      <div className="mt-4 flex items-center justify-center gap-5 border-t border-gray-100 pt-3 text-xs font-medium text-gray-500 dark:border-white/[0.06] dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Check className="h-2.5 w-2.5" strokeWidth={4} />
          </span>
          Completed
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="bg-brand h-3.5 w-3.5 rounded-full" />
          Today
        </span>
      </div>
    </div>
  );
}
