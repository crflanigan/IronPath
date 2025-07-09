import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Exercise, ExerciseSet } from '@shared/schema';
import { Check, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExerciseFormProps {
  exercise: Exercise;
  onUpdate: (exercise: Exercise) => void;
  isActive?: boolean;
}

export function ExerciseForm({ exercise, onUpdate, isActive = false }: ExerciseFormProps) {
  const [localExercise, setLocalExercise] = useState<Exercise>(exercise);
  const [restDigits, setRestDigits] = useState<string[]>(
    exercise.sets.map((s) => s.rest?.replace(/\D/g, '') || '')
  );
  const { toast } = useToast();

  const isSetComplete = (set: ExerciseSet) =>
    set.weight !== undefined && set.reps !== undefined;

  const formatRest = (digits: string) => {
    if (digits.length === 0) return '';
    return digits.length <= 2
      ? `0:${digits.padStart(2, '0')}`
      : `${parseInt(digits.slice(0, -2))}:${digits.slice(-2)}`;
  };

  const updateSet = (
    setIndex: number,
    field: keyof ExerciseSet,
    value: string | number | boolean | undefined
  ) => {
    const updatedSets = [...localExercise.sets];
    updatedSets[setIndex] = {
      ...updatedSets[setIndex],
      [field]: value
    };


    const exerciseCompleted = updatedSets.every(s => s.completed);
    const updatedExercise = {
      ...localExercise,
      sets: updatedSets,
      completed: exerciseCompleted
    };
    setLocalExercise(updatedExercise);
    onUpdate(updatedExercise);
  };

  const markSetComplete = (setIndex: number) => {
    const set = localExercise.sets[setIndex];
    if (!isSetComplete(set)) {
      toast({
        title: 'Set incomplete',
        description: 'Enter weight and reps first',
        variant: 'destructive'
      });
      return;
    }

    const updatedSets = [...localExercise.sets];
    const rest = (set.rest ?? '').trim() === '' ? '1:00' : set.rest!;
    updatedSets[setIndex] = { ...updatedSets[setIndex], rest, completed: true };
    setRestDigits((prev) => {
      const copy = [...prev];
      copy[setIndex] = rest.replace(/\D/g, '');
      return copy;
    });

    const exerciseCompleted = updatedSets.every(s => s.completed);
    const updatedExercise = {
      ...localExercise,
      sets: updatedSets,
      completed: exerciseCompleted,
    };
    setLocalExercise(updatedExercise);
    onUpdate(updatedExercise);
  };

  const getSetStatus = (set: ExerciseSet, index: number) => {
    if (set.completed) return 'completed';
    if (index === localExercise.sets.findIndex(s => !s.completed)) return 'current';
    return 'pending';
  };

  const getWeightChange = () => {
    const currentWeight = Math.max(...localExercise.sets.map(s => s.weight || 0));
    const bestWeight = localExercise.bestWeight || 0;
    const difference = currentWeight - bestWeight;
    
    if (difference > 0) return { change: `↑ +${difference} lbs`, color: 'text-blue-600' };
    if (difference < 0) return { change: `↓ ${Math.abs(difference)} lbs`, color: 'text-red-600' };
    return { change: '', color: '' };
  };

  const borderColor = localExercise.completed ? 'border-green-500' : 
                     isActive ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600';

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">{localExercise.machine}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {localExercise.region} • {localExercise.feel} Feel
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {localExercise.completed && <Check className="h-5 w-5 text-green-500" />}
            {isActive && !localExercise.completed && <Clock className="h-5 w-5 text-blue-500" />}
          </div>
        </div>

        {/* Sets */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Sets
          </div>
          
          {localExercise.sets.map((set, index) => {
            const status = getSetStatus(set, index);
            const weightError = set.weight === undefined;
            const repsError = set.reps === undefined;
            const restError = (set.rest ?? '').trim() === '' && set.completed;
            
            return (
              <div
                key={index}
                className={`flex items-center space-x-2 p-2 rounded ${
                  status === 'completed' ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' :
                  status === 'current' ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' :
                  'bg-gray-50 dark:bg-gray-700'
                }`}
              >
                <span className={`text-sm font-medium w-8 ${
                  status === 'completed' ? 'text-green-600 dark:text-green-400' :
                  status === 'current' ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-400 dark:text-gray-500'
                }`}>
                  {index + 1}
                </span>
                
                <Input
                  type="number"
                  inputMode="decimal"
                  value={set.weight ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*$/.test(v)) {
                      updateSet(index, 'weight', v === '' ? undefined : parseInt(v));
                    }
                  }}
                  className={`w-16 text-sm ${weightError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="lbs"
                  disabled={false}
                />
                
                <span className="text-xs text-gray-500 dark:text-gray-400">×</span>
                
                <Input
                  type="number"
                  inputMode="decimal"
                  value={set.reps ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*$/.test(v)) {
                      updateSet(index, 'reps', v === '' ? undefined : parseInt(v));
                    }
                  }}
                  className={`w-14 text-sm ${repsError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="reps"
                  disabled={false}
                />
                
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9:]*"
                  value={set.rest ?? ''}
                  onChange={(e) => {
                    const inputEv = e.nativeEvent as InputEvent;
                    let digits = restDigits[index] || '';

                    if (inputEv.inputType?.startsWith('delete')) {
                      digits = digits.slice(0, -1);
                    } else if (inputEv.inputType === 'insertFromPaste') {
                      digits = e.target.value.replace(/\D/g, '').slice(0, 3);
                    } else {
                      const char = inputEv.data ?? '';
                      if (/^\d$/.test(char) && digits.length < 3) {
                        digits += char;
                      }
                    }

                    setRestDigits((prev) => {
                      const copy = [...prev];
                      copy[index] = digits;
                      return copy;
                    });
                    updateSet(index, 'rest', formatRest(digits));
                  }}
                  className={`w-16 text-sm ${restError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  placeholder="rest"
                  disabled={false}
                />
                
                {status === 'current' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => markSetComplete(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✓
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Best Performance */}
        <div className="mt-2 flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">BEST:</span>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {localExercise.bestWeight} lbs × {localExercise.bestReps} reps
          </span>
          {getWeightChange().change && (
            <span className={`text-xs ${getWeightChange().color}`}>
              {getWeightChange().change}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
