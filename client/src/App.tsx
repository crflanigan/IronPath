import { useState } from 'react';
import { Switch, Route, useLocation, useParams } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider, useThemeContext } from '@/components/theme-provider';
import { ViewStackProvider } from '@/components/view-stack-provider';
import { Button } from '@/components/ui/button';
import { CalendarPage } from '@/pages/calendar';
import { WorkoutPage } from '@/pages/workout';
import { HistoryPage } from '@/pages/history';
import { Workout } from '@shared/schema';
import { useWorkoutStorage } from '@/hooks/use-workout-storage';
import { Dumbbell, Moon, Sun, Settings } from 'lucide-react';
import { SettingsDialog } from '@/components/SettingsDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';

function Navigation() {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useThemeContext();

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-md mx-auto px-4">
        <div className="flex space-x-0">
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            className={`flex-1 py-3 font-medium border-b-2 transition-colors ${location === '/' ? 'text-primary border-primary' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Calendar
          </Button>
          <Button
            variant="ghost"
            onClick={() => setLocation('/history')}
            className={`flex-1 py-3 font-medium border-b-2 transition-colors ${location === '/history' ? 'text-primary border-primary' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            History
          </Button>
        </div>
      </div>
    </nav>
  );
}

function Header() {
  const { theme, toggleTheme } = useThemeContext();
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Dumbbell className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">IronPath</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={toggleTheme} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <SettingsDialog>
              <Button variant="ghost" size="sm" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                <Settings className="h-4 w-4" />
              </Button>
            </SettingsDialog>
          </div>
        </div>
      </div>
    </header>
  );
}

function WorkoutRoute() {
  const params = useParams();
  const { workouts, loading } = useWorkoutStorage();
  const workoutId = params.id ? parseInt(params.id, 10) : null;
  const currentWorkout = workoutId ? workouts.find(w => w.id === workoutId) : null;

  if (loading) {
    return <div className="max-w-md mx-auto p-4 text-center">Loading workout...</div>;
  }

  if (!currentWorkout) {
    return (
      <div className="max-w-md mx-auto p-4 text-center">
        <p className="text-gray-600 dark:text-gray-400">Workout not found</p>
        <Button onClick={() => window.location.href = '/'} className="mt-4">Go to Calendar</Button>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <WorkoutPage 
        workout={currentWorkout} 
        onNavigateBack={() => window.location.href = '/'} 
      />
    </ErrorBoundary>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <Navigation />
      
      <main className="flex-1 overflow-y-auto">
        <Switch>
          <Route path="/" component={CalendarPage} />
          <Route path="/workout/:id" component={WorkoutRoute} />
          <Route path="/history" component={HistoryPage} />
          <Route>
            <div className="max-w-md mx-auto p-4 text-center">
              <p className="text-gray-600 dark:text-gray-400">Page not found</p>
              <Button onClick={() => window.location.href = '/'} className="mt-4">Go to Calendar</Button>
            </div>
          </Route>
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ViewStackProvider>
            <AppContent />
          </ViewStackProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
