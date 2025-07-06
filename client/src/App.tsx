import { useState } from 'react';
import { Switch, Route, useLocation } from 'wouter';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider, useThemeContext } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { CalendarPage } from '@/pages/calendar';
import { WorkoutPage } from '@/pages/workout';
import { HistoryPage } from '@/pages/history';
import { Workout } from '@shared/schema';
import { Dumbbell, Moon, Sun, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from '@/components/ui/dropdown-menu';
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
import { localWorkoutStorage } from '@/lib/storage';

function Navigation() {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useThemeContext();

  const navItems = [
    { path: '/', label: 'Calendar', icon: '📅' },
    { path: '/history', label: 'History', icon: '📊' }
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-md mx-auto px-4">
        <div className="flex space-x-0">
          {navItems.map(item => (
            <Button
              key={item.path}
              variant="ghost"
              onClick={() => setLocation(item.path)}
              className={`flex-1 py-3 font-medium border-b-2 transition-colors ${
                location === item.path
                  ? 'text-primary border-primary'
                  : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {item.label}
            </Button>
          ))}
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
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">IronPup</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              ) : (
                <Moon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem>Reset App Data</DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Application</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will delete all workouts and preferences. Continue?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 text-white hover:bg-red-700"
                        onClick={async () => {
                          await localWorkoutStorage.clearAllData();
                          window.location.reload();
                        }}
                      >
                        Reset
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [location, setLocation] = useLocation();

  console.log("Current location:", location); // 👈 Add this line

  const navigateToWorkout = (workout: Workout) => {
    setCurrentWorkout(workout);
    setLocation('/workout');
  };

  const navigateBack = () => {
    setCurrentWorkout(null);
    setLocation('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <Header />
      <Navigation />
      
      <main className="flex-1 overflow-y-auto">
        <Switch>
          <Route path="/" component={() => (
            <CalendarPage onNavigateToWorkout={navigateToWorkout} />
          )} />
          <Route path="/workout" component={() => (
            currentWorkout ? (
              <WorkoutPage workout={currentWorkout} onNavigateBack={navigateBack} />
            ) : (
              <div className="max-w-md mx-auto p-4 text-center">
                <p className="text-gray-600 dark:text-gray-400">No workout selected</p>
                <Button onClick={() => setLocation('/')} className="mt-4">
                  Go to Calendar
                </Button>
              </div>
            )
          )} />
          <Route path="/history"><HistoryPage /></Route>
          <Route>
            <div className="max-w-md mx-auto p-4 text-center">
              <p className="text-gray-600 dark:text-gray-400">Page not found</p>
              <Button onClick={() => setLocation('/')} className="mt-4">
                Go to Calendar
              </Button>
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
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
