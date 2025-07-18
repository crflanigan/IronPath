import React, { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addDays, subDays, startOfDay, isSameDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { WorkoutTemplateSelectorModal } from '@/components/WorkoutTemplateSelectorModal';
import { CustomWorkoutBuilderModal } from '@/components/CustomWorkoutBuilderModal';
import { Exercise, AbsExercise, Workout } from '@shared/schema';
import { workoutTemplates } from '@/lib/workout-data';
import { formatLocalDate } from '@/lib/utils';
import { Plus, Dumbbell, Calendar as CalendarIcon, Target, TrendingUp } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: Workout;
}

export default function CalendarPage() {
  const {
    workouts,
    customTemplates,
    loading,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    addCustomTemplate,
    updateCustomTemplate,
    refreshCustomTemplates,
  } = useWorkoutStorage();

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showCustomWorkoutBuilder, setShowCustomWorkoutBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());

  // Convert workouts to calendar events
  const events: CalendarEvent[] = workouts.map((workout) => {
    const workoutDate = new Date(workout.date + 'T00:00:00');
    return {
      id: workout.id,
      title: workout.type || 'Custom Workout',
      start: workoutDate,
      end: workoutDate,
      resource: workout,
    };
  });

  // Get stats for the current month
  const currentMonth = format(date, 'yyyy-MM');
  const monthlyWorkouts = workouts.filter(w => w.date.startsWith(currentMonth));
  const completedThisMonth = monthlyWorkouts.filter(w => w.completed).length;
  const totalThisMonth = monthlyWorkouts.length;

  // Get weekly stats
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);
  const weeklyWorkouts = workouts.filter(w => {
    const workoutDate = new Date(w.date + 'T00:00:00');
    return workoutDate >= weekStart && workoutDate <= weekEnd;
  });
  const completedThisWeek = weeklyWorkouts.filter(w => w.completed).length;

  const handleSelectSlot = ({ start }: { start: Date }) => {
    const dateStr = formatLocalDate(start);
    setSelectedDate(dateStr);
    setShowTemplateSelector(true);
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    // Navigate to workout details or edit
    window.location.href = `/workout/${event.resource.id}`;
  };

  const handleTemplateSelect = async (templateName: string) => {
    if (!selectedDate) return;

    try {
      // Check if it's a custom template
      const custom = customTemplates.find(t => t.name === templateName);
      if (custom) {
        const newWorkout = {
          date: selectedDate,
          type: custom.name,
          completed: false,
          cardio: { completed: false },
          abs: custom.abs?.map(abs => ({ ...abs, completed: false })) || [],
          exercises: custom.exercises.map(exercise => ({
            ...exercise,
            completed: false,
            sets: exercise.sets || [{ weight: 0, reps: 0, rest: "2:00", completed: false }],
          })),
        };

        const created = await createWorkout(newWorkout);
        if (created) {
          toast({
            title: "Workout Created",
            description: `${templateName} scheduled for ${selectedDate}`,
          });
          window.location.href = `/workout/${created.id}`;
        }
      } else {
        // Handle built-in templates
        const template = workoutTemplates[templateName as keyof typeof workoutTemplates];
        if (template) {
          const newWorkout = {
            date: selectedDate,
            type: templateName,
            completed: false,
            cardio: {
              type: "Treadmill",
              duration: "",
              distance: "",
              completed: false,
            },
            abs: template.abs.map(a => ({ ...a, completed: false })),
            exercises: template.exercises.map(e => ({
              ...e,
              completed: false,
              sets: e.sets.map(set => ({ ...set, completed: false })),
            })),
          };

          const created = await createWorkout(newWorkout);
          if (created) {
            toast({
              title: "Workout Created",
              description: `${templateName} scheduled for ${selectedDate}`,
            });
            window.location.href = `/workout/${created.id}`;
          }
        }
      }
    } catch (error) {
      console.error('Error creating workout:', error);
      toast({
        title: "Error",
        description: "Failed to create workout",
        variant: "destructive",
      });
    }

    setShowTemplateSelector(false);
    setSelectedDate(null);
  };

  const handleCustomWorkoutCreate = async (
    name: string,
    exercises: Exercise[],
    abs: AbsExercise[],
    includeInSchedule: boolean,
  ) => {
    try {
      await addCustomTemplate({
        name,
        exercises,
        abs,
        includeInAutoSchedule: includeInSchedule,
      });

      toast({
        title: "Success",
        description: "Custom workout template created!",
      });
    } catch (error) {
      console.error('Error creating custom template:', error);
      toast({
        title: "Error",
        description: "Failed to create custom workout template",
        variant: "destructive",
      });
    }
  };

  const handleCustomWorkoutUpdate = async (
    id: number,
    name: string,
    exercises: Exercise[],
    abs: AbsExercise[],
    includeInSchedule: boolean,
  ) => {
    try {
      await updateCustomTemplate(id, {
        name,
        exercises,
        abs,
        includeInAutoSchedule: includeInSchedule,
      });

      toast({
        title: "Success",
        description: "Custom workout template updated!",
      });
    } catch (error) {
      console.error('Error updating custom template:', error);
      toast({
        title: "Error",
        description: "Failed to update custom workout template",
        variant: "destructive",
      });
    }
  };

  const eventStyleGetter = (event: CalendarEvent) => {
    const isCompleted = event.resource.completed;
    return {
      style: {
        backgroundColor: isCompleted ? '#10b981' : '#3b82f6',
        borderColor: isCompleted ? '#059669' : '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
      },
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Workout Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">Plan and track your fitness journey</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditingTemplate(null);
              setShowCustomWorkoutBuilder(true);
            }}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Custom Workout
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedThisWeek}</div>
            <p className="text-xs text-muted-foreground">
              {weeklyWorkouts.length} total scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              of {totalThisMonth} workouts completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalThisMonth > 0 ? Math.round((completedThisMonth / totalThisMonth) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              monthly completion rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Workout Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              view={view}
              onView={setView}
              date={date}
              onNavigate={setDate}
              onSelectSlot={handleSelectSlot}
              onSelectEvent={handleSelectEvent}
              selectable
              eventPropGetter={eventStyleGetter}
              components={{
                event: ({ event }) => (
                  <div className="text-xs">
                    <div className="font-medium truncate">{event.title}</div>
                    {event.resource.completed && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        ✓ Complete
                      </Badge>
                    )}
                  </div>
                ),
              }}
              messages={{
                next: "Next",
                previous: "Previous",
                today: "Today",
                month: "Month",
                week: "Week",
                day: "Day",
                agenda: "Agenda",
                date: "Date",
                time: "Time",
                event: "Event",
                noEventsInRange: "No workouts scheduled for this period",
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      {showTemplateSelector && (
        <WorkoutTemplateSelectorModal
          isOpen={showTemplateSelector}
          onClose={() => {
            setShowTemplateSelector(false);
            setSelectedDate(null);
          }}
          onSelectTemplate={handleTemplateSelect}
          onCreateCustom={() => {
            setShowTemplateSelector(false);
            setEditingTemplate(null);
            setShowCustomWorkoutBuilder(true);
          }}
          selectedDate={selectedDate}
          customTemplates={customTemplates}
        />
      )}

      {showCustomWorkoutBuilder && (
        <CustomWorkoutBuilderModal
          onClose={() => {
            setShowCustomWorkoutBuilder(false);
            setEditingTemplate(null);
          }}
          onCreate={handleCustomWorkoutCreate}
          onUpdate={editingTemplate ? handleCustomWorkoutUpdate : undefined}
          refreshCustomTemplates={refreshCustomTemplates}
          editingTemplate={editingTemplate}
        />
      )}
    </div>
  );
}
