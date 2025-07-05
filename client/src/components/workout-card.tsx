import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Workout } from '@shared/schema';
import { Calendar, Clock, CheckCircle, PlayCircle } from 'lucide-react';

interface WorkoutCardProps {
  workout: Workout;
  onStart: () => void;
  onView: () => void;
}

export function WorkoutCard({ workout, onStart, onView }: WorkoutCardProps) {
  const completedExercises = workout.exercises.filter(e => e.completed).length;
  const totalExercises = workout.exercises.length;
  const completionPercentage = totalExercises > 0 ? (completedExercises / totalExercises) * 100 : 0;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {workout.type}
          </CardTitle>
          <Badge variant={workout.completed ? "default" : "secondary"}>
            {workout.completed ? <CheckCircle className="h-3 w-3 mr-1" /> : <Clock className="h-3 w-3 mr-1" />}
            {workout.completed ? 'Completed' : 'Pending'}
          </Badge>
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4 mr-1" />
          {formatDate(workout.date)}
          {workout.duration && (
            <>
              <span className="mx-2">•</span>
              <Clock className="h-4 w-4 mr-1" />
              {workout.duration} min
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Progress:</span>
            <span className="font-medium text-primary">
              {completedExercises}/{totalExercises} exercises
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onView}
              className="flex-1"
            >
              View Details
            </Button>
            <Button
              size="sm"
              onClick={onStart}
              className="flex-1"
              disabled={workout.completed}
            >
              <PlayCircle className="h-4 w-4 mr-1" />
              {workout.completed ? 'Completed' : 'Start'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
