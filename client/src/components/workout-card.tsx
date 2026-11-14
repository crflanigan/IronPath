import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Workout } from '@shared/schema';
import { parseISODate } from '@/lib/utils';
import {
  Calendar,
  Clock,
  CheckCircle,
  PlayCircle,
  Trash2
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction
} from '@/components/ui/alert-dialog';

interface WorkoutCardProps {
  workout: Workout;
  onStart: () => void;
  onView: () => void;
  onDelete?: () => void;
}

export function WorkoutCard({ workout, onStart, onView, onDelete }: WorkoutCardProps) {
  const completedExercises = workout.exercises.filter(e => e.completed).length;
  const totalExercises = workout.exercises.length;
  const completionPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  const formatDate = (dateString: string) => {
    const date = parseISODate(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-gray-900 dark:text-white">
            {workout.type}
          </div>
          <div className="mt-0.5 flex items-center text-xs text-gray-500 dark:text-gray-400">
            <Calendar className="mr-1 h-3.5 w-3.5" />
            {formatDate(workout.date)}
            {workout.duration && (
              <>
                <span className="mx-1.5">•</span>
                <Clock className="mr-1 h-3.5 w-3.5" />
                {workout.duration} min
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="secondary"
            className={
              workout.completed
                ? 'border-transparent bg-primary/15 text-primary hover:bg-primary/15'
                : 'border-transparent bg-amber-500/15 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400'
            }
          >
            {workout.completed ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
            {workout.completed ? 'Completed' : 'Pending'}
          </Badge>
          {onDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  aria-label="Delete this workout"
                  size="icon"
                  variant="ghost"
                  className="-mr-1.5 h-8 w-8 rounded-full p-0 text-gray-400 hover:bg-red-500/10 hover:text-red-600 dark:text-gray-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Workout</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this workout?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 bg-none text-white shadow-none hover:bg-red-700"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-gray-500 dark:text-gray-400">Progress:</span>
          <span className="nums font-semibold text-primary">
            {completedExercises}/{totalExercises} exercises
          </span>
        </div>

        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
          <div
            className="bg-brand h-full rounded-full transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onView} className="flex-1">
            View Details
          </Button>
          <Button
            size="sm"
            onClick={onStart}
            className="flex-1"
            disabled={workout.completed ?? false}
          >
            <PlayCircle className="h-4 w-4" />
            {workout.completed ? 'Completed' : 'Start'}
          </Button>
        </div>
      </div>
    </div>
  );
}
