import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Exercise, AbsExercise } from '@shared/schema';
import { workoutTemplates } from '@/lib/workout-data';
import { Dumbbell, Plus, X, Save, ArrowLeft } from 'lucide-react';
import { ErrorBoundary } from './ErrorBoundary';

interface CustomWorkoutBuilderModalProps {
  onClose: () => void;
  onCreate: (
    name: string,
    exercises: Exercise[],
    abs: AbsExercise[],
    includeInSchedule: boolean,
  ) => void;
  onUpdate?: (
    id: number,
    name: string,
    exercises: Exercise[],
    abs: AbsExercise[],
    includeInSchedule: boolean,
  ) => void;
  refreshCustomTemplates?: () => void;
  editingTemplate?: {
    id: number;
    name: string;
    exercises: Exercise[];
    abs?: AbsExercise[];
    includeInAutoSchedule?: boolean;
  };
}

export function CustomWorkoutBuilderModal({
  onClose,
  onCreate,
  onUpdate,
  refreshCustomTemplates,
  editingTemplate,
}: CustomWorkoutBuilderModalProps) {
  const [name, setName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<Exercise[]>([]);
  const [selectedAbs, setSelectedAbs] = useState<AbsExercise[]>([]);
  const [includeInAutoSchedule, setIncludeInAutoSchedule] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  // Initialize form with editing template data
  useEffect(() => {
    if (editingTemplate) {
      setName(editingTemplate.name);
      setSelectedExercises(editingTemplate.exercises);
      setSelectedAbs(editingTemplate.abs || []);
      setIncludeInAutoSchedule(editingTemplate.includeInAutoSchedule || false);
    }
  }, [editingTemplate]);

  // Get all available exercises from workout templates
  const allExercises = React.useMemo(() => {
    const exercises: Exercise[] = [];
    Object.values(workoutTemplates).forEach(template => {
      template.exercises.forEach(exercise => {
        // Avoid duplicates
        if (!exercises.some(e => e.machine === exercise.machine)) {
          exercises.push(exercise);
        }
      });
    });
    return exercises.sort((a, b) => a.machine.localeCompare(b.machine));
  }, []);

  // Get all available abs exercises
  const allAbsExercises = React.useMemo(() => {
    const absExercises: AbsExercise[] = [];
    Object.values(workoutTemplates).forEach(template => {
      template.abs.forEach(abs => {
        // Avoid duplicates
        if (!absExercises.some(a => a.name === abs.name)) {
          absExercises.push(abs);
        }
      });
    });
    return absExercises.sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  // Filter exercises based on search and region
  const filteredExercises = allExercises.filter(exercise => {
    const matchesSearch = exercise.machine.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRegion = selectedRegion === 'all' || exercise.region === selectedRegion;
    return matchesSearch && matchesRegion;
  });

  // Get unique regions for filter
  const regions = React.useMemo(() => {
    const regionSet = new Set(allExercises.map(e => e.region));
    return Array.from(regionSet).sort();
  }, [allExercises]);

  const handleExerciseToggle = (exercise: Exercise) => {
    setSelectedExercises(prev => {
      const exists = prev.some(e => e.machine === exercise.machine);
      if (exists) {
        return prev.filter(e => e.machine !== exercise.machine);
      } else {
        return [...prev, exercise];
      }
    });
  };

  const handleAbsToggle = (abs: AbsExercise) => {
    setSelectedAbs(prev => {
      const exists = prev.some(a => a.name === abs.name);
      if (exists) {
        return prev.filter(a => a.name !== abs.name);
      } else {
        return [...prev, abs];
      }
    });
  };

  const handleSave = () => {
    if (!name.trim()) {
      return;
    }

    if (editingTemplate && onUpdate) {
      onUpdate(
        editingTemplate.id,
        name.trim(),
        selectedExercises,
        selectedAbs,
        includeInAutoSchedule
      );
    } else {
      onCreate(name.trim(), selectedExercises, selectedAbs, includeInAutoSchedule);
      // Refresh custom templates after creating a new template
      refreshCustomTemplates?.();
    }

    onClose();
  };

  const isExerciseSelected = (exercise: Exercise) => {
    return selectedExercises.some(e => e.machine === exercise.machine);
  };

  const isAbsSelected = (abs: AbsExercise) => {
    return selectedAbs.some(a => a.name === abs.name);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <ErrorBoundary>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              {editingTemplate ? 'Edit Custom Workout' : 'Create Custom Workout'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 h-full">
            {/* Workout Name */}
            <div className="space-y-2">
              <Label htmlFor="workout-name">Workout Name</Label>
              <Input
                id="workout-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter workout name..."
                className="w-full"
              />
            </div>

            {/* Include in Auto Schedule */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="auto-schedule"
                checked={includeInAutoSchedule}
                onCheckedChange={(checked) => setIncludeInAutoSchedule(!!checked)}
              />
              <Label htmlFor="auto-schedule">Include in auto-schedule rotation</Label>
            </div>

            <div className="flex-1 overflow-hidden">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                {/* Exercise Selection */}
                <Card className="flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Select Exercises</CardTitle>
                    
                    {/* Search and Filter */}
                    <div className="space-y-2">
                      <Input
                        placeholder="Search exercises..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      <select
                        value={selectedRegion}
                        onChange={(e) => setSelectedRegion(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="all">All Regions</option>
                        {regions.map(region => (
                          <option key={region} value={region}>{region}</option>
                        ))}
                      </select>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full">
                      <div className="space-y-2">
                        {filteredExercises.map((exercise) => (
                          <div
                            key={exercise.machine}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isExerciseSelected(exercise)
                                ? 'border-primary bg-primary/10'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handleExerciseToggle(exercise)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{exercise.machine}</div>
                                <div className="text-sm text-gray-600 flex gap-2">
                                  <Badge variant="secondary">{exercise.region}</Badge>
                                  <Badge variant="outline">{exercise.equipment}</Badge>
                                </div>
                              </div>
                              {isExerciseSelected(exercise) && (
                                <div className="text-primary">
                                  <Plus className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Selected Items and Abs */}
                <div className="space-y-4 flex flex-col h-full">
                  {/* Selected Exercises */}
                  <Card className="flex-1">
                    <CardHeader>
                      <CardTitle className="text-lg">Selected Exercises ({selectedExercises.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        {selectedExercises.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No exercises selected</p>
                        ) : (
                          <div className="space-y-2">
                            {selectedExercises.map((exercise) => (
                              <div
                                key={exercise.machine}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <span className="text-sm">{exercise.machine}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExerciseToggle(exercise)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  {/* Abs Exercises */}
                  <Card className="flex-1">
                    <CardHeader>
                      <CardTitle className="text-lg">Abs Exercises</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {allAbsExercises.map((abs) => (
                            <div
                              key={abs.name}
                              className={`p-2 border rounded cursor-pointer transition-colors ${
                                isAbsSelected(abs)
                                  ? 'border-primary bg-primary/10'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleAbsToggle(abs)}
                            >
                              <div className="flex justify-between items-center">
                                <span className="text-sm">{abs.name}</span>
                                {isAbsSelected(abs) && (
                                  <Plus className="h-3 w-3 text-primary" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!name.trim() || selectedExercises.length === 0}
              >
                <Save className="h-4 w-4 mr-2" />
                {editingTemplate ? 'Update Workout' : 'Create Workout'}
              </Button>
            </div>
          </div>
        </ErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
