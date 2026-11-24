import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Workout } from '@shared/schema';
import {
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
import { workoutBegun } from '@/lib/workout-summary';

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

  const begun = workoutBegun(workout);

  return (
    <div className="relative rounded-xl bg-gray-50 p-4 dark:bg-white/[0.04]">
      <div className="flex items-center justify-between gap-3">
        {/* The panel this sits in is already headed with the day and the
            workout's name; repeating both here only gave the name less room
            than it needed. */}
        <div className="flex min-w-0 items-center text-xs text-gray-500 dark:text-gray-400">
          {typeof workout.duration === 'number' && workout.duration > 0 && (
            <>
              <Clock className="mr-1 h-3.5 w-3.5" />
              {workout.duration} min
            </>
          )}
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

        {/* One button, for the one thing there is to do. There were two that
            opened the same screen, and on a finished workout the second was a
            disabled "Completed" beside a badge already saying so. */}
        {workout.completed ? (
          <Button variant="outline" onClick={onView} className="w-full">
            View Details
          </Button>
        ) : (
          <Button onClick={onStart} className="w-full">
            <PlayCircle className="h-4 w-4" />
            {begun ? 'Continue Workout' : 'Start Workout'}
          </Button>
        )}
      </div>
    </div>
  );
}
