import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Workout } from '@shared/schema';
import { generateWorkoutSchedule } from '@/lib/workout-data';
import { cn, formatLocalDate } from '@/lib/utils';

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
  const today = new Date();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const prevMonth = new Date(year, month - 1, 0);
  const prevMonthDays = prevMonth.getDate();

  const calendarDays = [];

  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    calendarDays.push({
      day: day,
      date: formatLocalDate(new Date(year, month - 1, day)),
      isCurrentMonth: false,
      isToday: false
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = formatLocalDate(date);
    const isToday = date.toDateString() === today.toDateString();

    calendarDays.push({
      day: day,
      date: dateString,
      isCurrentMonth: true,
      isToday
    });
  }

  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day: day,
      date: formatLocalDate(new Date(year, month + 1, day)),
      isCurrentMonth: false,
      isToday: false
    });
  }

  const workoutSchedule = generateWorkoutSchedule(year, month + 1);

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
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
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
            'h-24 w-full flex flex-col items-center justify-between p-1 text-sm leading-tight rounded-lg';
          const isCompleted = workout?.completed || false;
          const isSelected = selectedDate === dayData.date;

          if (!dayData.isCurrentMonth) {
            return (
              <div
                key={index}
                className={cn(sharedClasses, 'text-gray-400 dark:text-gray-600')}
              >
                <span className="text-base font-semibold leading-none">{dayData.day}</span>
                <span className="text-xs text-transparent select-none">-</span>
                <span className="text-xs text-transparent select-none">-</span>
              </div>
            );
          }

          const status = dayData.isToday
            ? '📅'
            : isCompleted
              ? '✅'
              : hasWorkout
                ? '🕒'
                : '';

          if (hasWorkout) {
            const workoutType = workout?.type || scheduledWorkout?.type;

            return (
              <Button
                key={index}
                variant="ghost"
                className={cn(
                  sharedClasses,
                  'bg-white dark:bg-gray-800 border hover:shadow-md transition-shadow',
                  isSelected
                    ? 'border-primary ring-2 ring-primary'
                    : 'border-gray-200 dark:border-gray-700',
                  dayData.isToday && !isSelected
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : ''
                )}
                onClick={() => onSelectDate(dayData.date)}
              >
                <div className="text-base font-semibold leading-none">{dayData.day}</div>
                <div
                  className={cn(
                    'text-xs font-medium truncate',
                    isCompleted
                      ? 'text-green-600'
                      : dayData.isToday
                        ? 'text-blue-100'
                        : 'text-orange-600'
                  )}
                >
                  {workoutType?.split(',')[0] || 'Workout'}
                </div>
                <div className={cn('text-xs', !status && 'text-transparent select-none')}>
                  {status || '-'}
                </div>
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
              onClick={() => onSelectDate(dayData.date)}
            >
              <span className="text-base font-semibold leading-none">{dayData.day}</span>
              <span className="text-xs text-transparent select-none">-</span>
              <div className={cn('text-xs', !dayData.isToday && 'text-transparent select-none')}>
                {dayData.isToday ? '📅' : '-'}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
