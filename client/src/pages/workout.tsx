import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExerciseForm } from '@/components/exercise-form';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { Workout, Exercise, AbsExercise, Cardio } from '@shared/schema';
import { parseISODate } from '@/lib/utils';
import { Save, CheckCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorkoutPageProps {
  workout: Workout;
  onNavigateBack: () => void;
}

export function WorkoutPage({ workout: initialWorkout, onNavigateBack }: WorkoutPageProps) {
  const [workout, setWorkout] = useState<Workout>(initialWorkout);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const { updateWorkout } = useWorkoutStorage();
  const { toast } = useToast();


  useEffect(() => {
    // Auto-save functionality
    if (autoSaveEnabled) {
      const saveTimeout = setTimeout(() => {
        handleSave();
      }, 2000);
      
      return () => clearTimeout(saveTimeout);
    }
  }, [workout, autoSaveEnabled]);

  useEffect(() => {
    // Find the first incomplete exercise
    const firstIncompleteIndex = workout.exercises.findIndex(e => !e.completed);
    if (firstIncompleteIndex !== -1) {
      setCurrentExerciseIndex(firstIncompleteIndex);
    }
  }, [workout.exercises]);

  const handleSave = async () => {
    try {
      await updateWorkout(workout.id, {
        exercises: workout.exercises,
        abs: workout.abs,
        cardio: workout.cardio,
        completed: workout.completed,
        duration: workout.duration
      });
      
      if (autoSaveEnabled) {
        toast({
          title: "Auto-saved",
          description: "Your workout progress has been saved",
          duration: 2000
        });
      }
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save workout progress",
        variant: "destructive"
      });
    }
  };

  const handleExerciseUpdate = (updatedExercise: Exercise) => {
    const updatedExercises = workout.exercises.map(e => 
      e.machine === updatedExercise.machine ? updatedExercise : e
    );
    
    setWorkout(prev => ({ ...prev, exercises: updatedExercises }));
  };

  const handleAbsUpdate = (index: number, field: keyof AbsExercise, value: string | number | boolean) => {
    const updatedAbs = [...workout.abs];
    updatedAbs[index] = { ...updatedAbs[index], [field]: value };
    setWorkout(prev => ({ ...prev, abs: updatedAbs }));
  };

  const handleCardioUpdate = (field: keyof Cardio, value: string | boolean) => {
    const updatedCardio = { ...workout.cardio!, [field]: value };
    setWorkout(prev => ({ ...prev, cardio: updatedCardio }));
  };

  const handleCompleteWorkout = async () => {
    const allExercisesComplete = workout.exercises.every(e => e.completed);
    const allAbsComplete = workout.abs.every(a => a.completed);
    const cardioComplete = workout.cardio?.completed || false;
    
    if (!allExercisesComplete || !allAbsComplete || !cardioComplete) {
      toast({
        title: "Incomplete workout",
        description: "Please complete all exercises before marking as complete",
        variant: "destructive"
      });
      return;
    }

    const completedWorkout = {
      ...workout,
      completed: true,
      duration: calculateWorkoutDuration()
    };
    
    setWorkout(completedWorkout);
    
    try {
      await updateWorkout(workout.id, {
        exercises: completedWorkout.exercises,
        abs: completedWorkout.abs,
        cardio: completedWorkout.cardio,
        completed: true,
        duration: completedWorkout.duration
      });
      toast({
        title: "Workout completed! 🎉",
        description: "Great job! Your workout has been saved.",
        duration: 3000
      });
      
      setTimeout(() => {
        onNavigateBack();
      }, 2000);
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save completed workout",
        variant: "destructive"
      });
    }
  };

  const calculateWorkoutDuration = () => {
    // Simple duration calculation based on estimated time
    const exerciseTime = workout.exercises.length * 5; // 5 minutes per exercise
    const absTime = workout.abs.length * 2; // 2 minutes per ab exercise
    const cardioTime = 15; // 15 minutes cardio
    return exerciseTime + absTime + cardioTime;
  };

  const getProgressStats = () => {
    const completedExercises = workout.exercises.filter(e => e.completed).length;
    const totalExercises = workout.exercises.length;
    const completedAbs = workout.abs.filter(a => a.completed).length;
    const totalAbs = workout.abs.length;
    const cardioComplete = workout.cardio?.completed ? 1 : 0;
    
    const totalItems = totalExercises + totalAbs + 1; // +1 for cardio
    const completedItems = completedExercises + completedAbs + cardioComplete;
    
    return {
      completedExercises,
      totalExercises,
      completedAbs,
      totalAbs,
      cardioComplete,
      totalItems,
      completedItems,
      percentage: Math.round((completedItems / totalItems) * 100)
    };
  };

  const stats = getProgressStats();

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onNavigateBack}
          className="p-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
            {workout.type}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {parseISODate(workout.date).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Progress Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Progress:</span>
                <span className="text-sm font-medium text-primary">
                  {stats.completedItems}/{stats.totalItems} items
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-sm text-gray-600 dark:text-gray-400">Auto-save:</span>
                <span className="text-sm text-green-600">✅</span>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Exercises */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">Main Exercises</h3>
        
        {workout.exercises.map((exercise, index) => (
          <ExerciseForm
            key={exercise.machine}
            exercise={exercise}
            onUpdate={handleExerciseUpdate}
            isActive={index === currentExerciseIndex}
          />
        ))}
      </div>

      {/* Abs Section */}
      <Card>
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Abs Block</h3>
          <div className="space-y-3">
            {workout.abs.map((absExercise, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {absExercise.name}
                </span>
                <div className="flex items-center space-x-2">
                  {absExercise.reps !== undefined ? (
                    <>
                      <Input
                        type="number"
                        value={absExercise.reps}
                        onChange={(e) => handleAbsUpdate(index, 'reps', parseInt(e.target.value) || 0)}
                        className="w-16 text-sm"
                        placeholder="reps"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">reps</span>
                    </>
                  ) : (
                    <>
                      <Input
                        type="text"
                        value={absExercise.time || ''}
                        onChange={(e) => handleAbsUpdate(index, 'time', e.target.value)}
                        className="w-16 text-sm"
                        placeholder="time"
                      />
                      <span className="text-xs text-gray-500 dark:text-gray-400">time</span>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAbsUpdate(index, 'completed', !absExercise.completed)}
                    className={absExercise.completed ? 'text-green-600' : 'text-gray-400'}
                  >
                    {absExercise.completed ? '✅' : '◯'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cardio Section */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Cardio Block</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCardioUpdate('completed', !workout.cardio?.completed)}
              className={workout.cardio?.completed ? 'text-green-600' : 'text-gray-400'}
            >
              {workout.cardio?.completed ? '✅' : '◯'}
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Type:</label>
              <Select
                value={workout.cardio?.type || 'Treadmill'}
                onValueChange={(value) => handleCardioUpdate('type', value as any)}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Treadmill">Treadmill</SelectItem>
                  <SelectItem value="Bike">Bike</SelectItem>
                  <SelectItem value="Elliptical">Elliptical</SelectItem>
                  <SelectItem value="Rowing">Rowing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Duration:</label>
                <Input
                  type="text"
                  value={workout.cardio?.duration || ''}
                  onChange={(e) => handleCardioUpdate('duration', e.target.value)}
                  className="w-20 text-sm"
                  placeholder="mm:ss"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Distance:</label>
                <Input
                  type="text"
                  value={workout.cardio?.distance || ''}
                  onChange={(e) => handleCardioUpdate('distance', e.target.value)}
                  className="w-20 text-sm"
                  placeholder="miles"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Button
          onClick={handleSave}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
        >
          <Save className="h-4 w-4 mr-2" />
          Save Workout
        </Button>
        
        <Button
          onClick={handleCompleteWorkout}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          disabled={workout.completed}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          {workout.completed ? 'Workout Completed' : 'Complete Workout'}
        </Button>
      </div>
    </div>
  );
}
