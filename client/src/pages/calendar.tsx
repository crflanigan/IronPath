import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { Workout } from '@shared/schema';
import { CalendarGrid } from '@/components/calendar-grid';
import { WorkoutCard } from '@/components/workout-card';
import { WorkoutTemplateSelectorModal } from '@/components/WorkoutTemplateSelectorModal';
import { CustomWorkoutBuilderModal } from '@/components/CustomWorkoutBuilderModal';
import { AutoScheduleModal } from '@/components/AutoScheduleModal';
import { CustomizeStreakModal } from '@/components/CustomizeStreakModal';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { parseISODate } from '@/lib/utils';
import { generateWorkoutSchedule } from '@/lib/workout-data';
import { localWorkoutStorage } from '@/lib/storage';
import { calculateDayStreak, calculateTopDayStreak } from '@/lib/streak';

interface CalendarPageProps {
  onNavigateToWorkout: (workout: Workout) => void;
}

export function CalendarPage({ onNavigateToWorkout }: CalendarPageProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'calendar' | 'templateSelector' | 'customWorkoutBuilder'>('calendar');
  const [templateToEdit, setTemplateToEdit] = useState<any>(null);
  const [prefillTemplate, setPrefillTemplate] = useState<any>(null);
  const [dateForCreation, setDateForCreation] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [streakModalOpen, setStreakModalOpen] = useState(false);

  const { workouts, createWorkout, deleteWorkout, customTemplates, refreshCustomTemplates, loading } = useWorkoutStorage();

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
  };

  const handleDeleteSelectedWorkout = async (id: number) => {
    await deleteWorkout(id);
    setSelectedDate(null);
  };

  const handleTemplateSelect = async (templateName: string) => {
    if (!dateForCreation) return;
    const today = dateForCreation;
    // ... (rest of your existing handleTemplateSelect logic - keep it the same)
    // At the end when you call onNavigateToWorkout, it will use the new path
  };

  // Keep all your existing logic for modals, custom templates, etc.

  const openTemplateSelector = (date: string) => {
    setDateForCreation(date);
    setCurrentView('templateSelector');
  };

  // ... rest of your file stays exactly the same until the navigation calls

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Your existing stats, calendar grid, legend, etc. — keep everything the same */}

      {/* Only change is in the WorkoutCard calls and handleStartTodayWorkout */}

      {selectedDate && workouts.find(w => w.date === selectedDate) && (
        <WorkoutCard
          workout={workouts.find(w => w.date === selectedDate)!}
          onStart={() => onNavigateToWorkout(workouts.find(w => w.date === selectedDate)!)}
          onView={() => onNavigateToWorkout(workouts.find(w => w.date === selectedDate)!)}
          onDelete={handleDeleteSelectedWorkout}
        />
      )}

      {/* ... rest of your file remains unchanged */}
    </div>
  );
}
