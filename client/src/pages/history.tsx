import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { Workout } from '@shared/schema';
import { BarChart, Calendar, Download, FileText, TrendingUp } from 'lucide-react';
import { parseISODate } from '@/lib/utils';
import { calculateDayStreak } from '@/lib/streak';
import { localWorkoutStorage } from '@/lib/storage';

export function HistoryPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const { workouts, exportData, exportCSV, loading } = useWorkoutStorage();


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
    const totalDuration = completed.reduce((sum, w) => sum + (w.duration || 0), 0);
    const avgDuration = totalWorkouts > 0 ? Math.round(totalDuration / totalWorkouts) : 0;

    const streakDays = localWorkoutStorage.getStreakDays();
    const currentStreak = calculateDayStreak(workouts, streakDays);

    const weightProgress = calculateWeightProgress(completed);

    return {
      totalWorkouts,
      avgDuration,
      currentStreak,
      weightProgress,
      completionRate: workouts.length > 0 ? Math.round((completed.length / workouts.length) * 100) : 0
    };
  }, [filteredWorkouts, workouts]);

  const getWorkoutsByType = () => {
    const types: { [key: string]: number } = {};
    filteredWorkouts.forEach(workout => {
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

      {/* Recent Workouts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Recent Workouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredWorkouts
              .filter(w => w.completed)
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
    </div>
  );
}
