import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import type { Workout } from '@shared/schema';
import { BarChart, Calendar, Download, FileText, TrendingUp } from 'lucide-react';
import { parseISODate } from '@/lib/utils';
import { calculateDayStreak } from '@/lib/streak';
import { localWorkoutStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { liftProgress, describeProgress, type LiftProgress } from '@/lib/progression';
import { Sparkline } from '@/components/Sparkline';
import { LiftProgressDialog } from '@/components/LiftProgressDialog';

export function HistoryPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const { workouts, exportData, exportCSV, loading } = useWorkoutStorage();
  const { toast } = useToast();
  const [openLift, setOpenLift] = useState<LiftProgress | null>(null);

  /* Scans every stored workout, and this page re-renders on filter changes. */
  const lifts = useMemo(
    () => liftProgress(workouts, localWorkoutStorage.getPersonalBestResets()),
    [workouts],
  );


  const calculateWeightProgress = (completedWorkouts: Workout[]) => {
    const exerciseProgress: { [key: string]: number[] } = {};

    completedWorkouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        if (!exerciseProgress[exercise.machine]) {
          exerciseProgress[exercise.machine] = [];
        }

        const maxWeight = Math.max(
          ...exercise.sets.map(s => s.weight ?? 0)
        );
        exerciseProgress[exercise.machine].push(maxWeight);
      });
    });

    const improvements = Object.entries(exerciseProgress)
      .map(([machine, weights]) => {
        const first = weights[0];
        const last = weights[weights.length - 1];
        const improvement = last - first;
        return {
          machine,
          improvement,
          percentage: first > 0 ? Math.round((improvement / first) * 100) : 0
        };
      })
      .filter(item => item.improvement > 0)
      .sort((a, b) => b.improvement - a.improvement);

    return improvements.slice(0, 5);
  };

  const filteredWorkouts = useMemo(() => {
    const now = new Date();
    const startDate = new Date();

    switch (selectedPeriod) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return workouts.filter(workout => parseISODate(workout.date) >= startDate);
  }, [workouts, selectedPeriod]);

  const stats = useMemo(() => {
    const completed = filteredWorkouts.filter(w => w.completed);
    const totalWorkouts = completed.length;
    // Only workouts that were actually timed. Before durations were measured
    // they were computed as `exercises * 5 + abs * 2 + cardio` — always 82
    // minutes for the default workout — and averaging those together with real
    // ones would produce a number that is neither. `startedAt` is what marks a
    // duration as measured.
    const timed = completed.filter(w => w.startedAt && typeof w.duration === 'number');
    const totalDuration = timed.reduce((sum, w) => sum + (w.duration ?? 0), 0);
    const avgDuration = timed.length > 0 ? Math.round(totalDuration / timed.length) : 0;

    const streakDays = localWorkoutStorage.getStreakDays();
    const currentStreak = calculateDayStreak(workouts, streakDays);

    const weightProgress = calculateWeightProgress(completed);

    return {
      totalWorkouts,
      avgDuration,
      currentStreak,
      weightProgress,
      // Both sides of this must respect the Week/Month/Year filter. It used
      // to divide the windowed count by *every workout ever stored*, so the
      // number fell the longer you had been training: 50 workouts, all of them
      // completed, reported 20%.
      completionRate:
        filteredWorkouts.length > 0
          ? Math.round((completed.length / filteredWorkouts.length) * 100)
          : 0,
    };
  }, [filteredWorkouts, workouts]);

  const getWorkoutsByType = () => {
    const types: { [key: string]: number } = {};
    // Completed only, to match the headline count above. Counting every
    // workout here let History report "0 Workouts" and, on the same screen,
    // "Back, Biceps & Legs — 1 workouts".
    filteredWorkouts.filter(w => w.completed).forEach(workout => {
      types[workout.type] = (types[workout.type] || 0) + 1;
    });
    return Object.entries(types).sort((a, b) => b[1] - a[1]);
  };

  const formatDate = (dateString: string) => {
    return parseISODate(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      if (format === 'json') {
        await exportData();
      } else {
        // A CSV of nothing is a 31-byte file containing a header row, which
        // downloaded silently and looked like the export had failed.
        if (workouts.filter(w => w.completed).length === 0) {
          toast({
            title: 'Nothing to export yet',
            description: 'Finish a workout and its sets will be in the CSV.',
          });
          return;
        }
        await exportCSV();
      }
    } catch (error) {
      console.error(`Export failed:`, error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Progress History</h2>
        <div className="flex space-x-1">
          {(['week', 'month', 'year'] as const).map(period => (
            <Button
              key={period}
              variant={selectedPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPeriod(period)}
              className="capitalize"
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.totalWorkouts}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Workouts</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.currentStreak}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.avgDuration}m</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Duration</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.completionRate}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Completion</div>
          </CardContent>
        </Card>
      </div>

      {/* Weight Progress */}
      {stats.weightProgress.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Weight Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.weightProgress.map((progress, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {progress.machine}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-green-600">
                      +{progress.improvement} lbs
                    </span>
                    <Badge variant="secondary">{progress.percentage}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart className="h-5 w-5 mr-2" />
            Workout Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/*
            * On a fresh install both this card and Recent Workouts rendered as
            * a heading over roughly 110px of nothing. That reads as something
            * failing to load rather than as "you have not trained yet", and it
            * is the first screen a new user is likely to reach.
            */}
          {getWorkoutsByType().length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Nothing here yet. Finish a workout and the types you train will
              show up, with a count for each.
            </p>
          )}
          <div className="space-y-2">
            {getWorkoutsByType().map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {type}
                </span>
                <Badge variant="outline">{count} workouts</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/*
        * Your lifts.
        *
        * The insight is the sentence — "125 lbs, up 45 since Jul 2025" — and
        * the shape beside it is decoration on top of that, not the other way
        * round. Most recently trained first, so what you are working on now is
        * what you see.
        */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Your lifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lifts.length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No lifts logged yet. Tick a set as done and the weights you
              lift will show up here, with how they have moved.
            </p>
          )}
          <div className="space-y-1">
            {lifts.map(lift => (
              <button
                key={lift.machine}
                type="button"
                onClick={() => setOpenLift(lift)}
                className="flex w-full items-center justify-between rounded p-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="min-w-0 flex-1 pr-3">
                  <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                    {lift.machine}
                  </span>
                  <span className="block text-xs text-gray-600 dark:text-gray-400">
                    {describeProgress(lift)}
                  </span>
                </span>
                <Sparkline
                  values={lift.points.map(p => p.weight)}
                  className="shrink-0 text-primary"
                />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Workouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredWorkouts.filter(w => w.completed).length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No completed workouts yet. Finish one and it will appear here.
            </p>
          )}
          <div className="space-y-3">
            {filteredWorkouts
              .filter(w => w.completed)
              // Newest first. Without the sort this sliced an ascending list
              // and showed the five *oldest* — so the session you just
              // finished was the one entry guaranteed not to appear in a card
              // called Recent.
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 5)
              .map(workout => (
                <div
                  key={workout.id}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{workout.type}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{formatDate(workout.date)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-medium">✅</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{workout.duration}m</div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Download className="h-5 w-5 mr-2" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button variant="outline" onClick={() => handleExport('csv')} className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Export to CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('json')} className="w-full">
              <Download className="h-4 w-4 mr-2" />
              Export to JSON
            </Button>
          </div>
        </CardContent>
      </Card>

      <LiftProgressDialog lift={openLift} onClose={() => setOpenLift(null)} />
    </div>
  );
}
