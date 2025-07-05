import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Workout } from '@shared/schema';
import { generateWorkoutSchedule } from '@/lib/workout-data';

interface CalendarGridProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onSelectDate: (date: string) => void;
  workouts: Workout[];
}

export function CalendarGrid({ 
  currentDate, 
  onDateChange, 
  onSelectDate, 
  workouts 
}: CalendarGridProps) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const today = new Date();
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  // Get previous month's last few days
  const prevMonth = new Date(year, month - 1, 0);
  const prevMonthDays = prevMonth.getDate();
  
  // Generate calendar days
  const calendarDays = [];
  
  // Previous month days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    calendarDays.push({
      day: day,
      date: new Date(year, month - 1, day).toISOString().split('T')[0],
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateString = date.toISOString().split('T')[0];
    const isToday = date.toDateString() === today.toDateString();
    
    calendarDays.push({
      day: day,
      date: dateString,
      isCurrentMonth: true,
      isToday
    });
  }
  
  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day: day,
      date: new Date(year, month + 1, day).toISOString().split('T')[0],
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  // Get workout schedule for the current month
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
      {/* Month Navigation */}
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

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Days of Week Header */}
        {daysOfWeek.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 p-2">
            {day}
          </div>
        ))}
        
        {/* Calendar Days */}
        {calendarDays.map((dayData, index) => {
          const workout = getWorkoutForDate(dayData.date);
          const scheduledWorkout = getScheduledWorkoutForDate(dayData.date);
          const hasWorkout = workout || scheduledWorkout;
        
          const sharedClasses = "aspect-square w-full flex flex-col items-center justify-center text-sm";
        
          if (!dayData.isCurrentMonth) {
            return (
              <div key={index} className={`${sharedClasses} text-gray-400 dark:text-gray-600`}>
                {dayData.day}
              </div>
            );
          }
        
          if (hasWorkout) {
            const workoutType = workout?.type || scheduledWorkout?.type;
            const isCompleted = workout?.completed || false;
            const status = isCompleted ? '✅' : (dayData.isToday ? '📅' : '🕒');
        
            return (
              <Button
                key={index}
                variant="ghost"
                className={`${sharedClasses} bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow`}
                onClick={() => onSelectDate(dayData.date)}
              >
                <div className={dayData.isToday ? 'text-white' : 'text-gray-900 dark:text-white'}>
                  {dayData.day}
                </div>
                <div className={`text-xs font-medium truncate ${
                  isCompleted ? 'text-green-600' : 
                  dayData.isToday ? 'text-blue-100' : 'text-orange-600'
                }`}>
                  {workoutType?.split(',')[0] || 'Workout'}
                </div>
                <div className="text-xs">{status}</div>
              </Button>
            );
          }
        
          return (
            <Button
              key={index}
              variant="ghost"
              className={`${sharedClasses} ${dayData.isToday ? 'bg-primary text-white hover:bg-primary/90' : ''} rounded-lg`}
              onClick={() => onSelectDate(dayData.date)}
            >
              {dayData.day}
            </Button>
          );
        })}
        
          if (dayData.isToday) {
            return (
              <Button
                key={index}
                variant="ghost"
                className="aspect-square bg-primary text-white rounded-lg shadow-sm p-1 hover:bg-primary/90 transition-colors"
                onClick={() => onSelectDate(dayData.date)}
              >
                <div className="text-sm font-medium">{dayData.day}</div>
              </Button>
            );
          }
          
          return (
            <div key={index} className="aspect-square text-center p-2">
              <div className="text-sm text-gray-900 dark:text-white">{dayData.day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
