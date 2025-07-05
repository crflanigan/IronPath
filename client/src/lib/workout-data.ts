import { Exercise, AbsExercise, WorkoutType } from "@shared/schema";

// Workout templates for different focus types
export const workoutTemplates: Record<WorkoutType, {
  exercises: Omit<Exercise, 'completed'>[];
  abs: Omit<AbsExercise, 'completed'>[];
}> = {
  "Chest, Shoulder Focus": {
    exercises: [
      {
        machine: "Cable Crossover",
        region: "Chest Pecs",
        feel: "Medium",
        sets: [
          { weight: 50, reps: 15, rest: "1:00", completed: false },
          { weight: 60, reps: 10, rest: "1:00", completed: false },
          { weight: 65, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 65,
        bestReps: 10
      },
      {
        machine: "Incline Dumbbell Press",
        region: "Chest Pecs",
        feel: "Hard",
        sets: [
          { weight: 45, reps: 12, rest: "1:30", completed: false },
          { weight: 50, reps: 10, rest: "1:30", completed: false },
          { weight: 55, reps: 8, rest: "1:30", completed: false }
        ],
        bestWeight: 48,
        bestReps: 10
      },
      {
        machine: "Shoulder Press Machine",
        region: "Shoulders",
        feel: "Medium",
        sets: [
          { weight: 40, reps: 12, rest: "1:00", completed: false },
          { weight: 45, reps: 10, rest: "1:00", completed: false },
          { weight: 50, reps: 8, rest: "1:00", completed: false }
        ],
        bestWeight: 45,
        bestReps: 10
      },
      {
        machine: "Lateral Raise Machine",
        region: "Shoulders",
        feel: "Light",
        sets: [
          { weight: 25, reps: 15, rest: "45", completed: false },
          { weight: 30, reps: 12, rest: "45", completed: false },
          { weight: 35, reps: 10, rest: "45", completed: false }
        ],
        bestWeight: 30,
        bestReps: 12
      }
    ],
    abs: [
      { name: "Crunch with Legs Elevated", reps: 30 },
      { name: "Plank Hold", time: "0:45" },
      { name: "Russian Twists", reps: 25 }
    ]
  },
  "Back and Legs": {
    exercises: [
      {
        machine: "Lat Pulldown",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 70, reps: 12, rest: "1:00", completed: false },
          { weight: 80, reps: 10, rest: "1:00", completed: false },
          { weight: 85, reps: 8, rest: "1:00", completed: false }
        ],
        bestWeight: 80,
        bestReps: 10
      },
      {
        machine: "Seated Cable Row",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 12, rest: "1:00", completed: false },
          { weight: 70, reps: 10, rest: "1:00", completed: false },
          { weight: 75, reps: 8, rest: "1:00", completed: false }
        ],
        bestWeight: 70,
        bestReps: 10
      },
      {
        machine: "Leg Press",
        region: "Legs",
        feel: "Hard",
        sets: [
          { weight: 180, reps: 15, rest: "2:00", completed: false },
          { weight: 200, reps: 12, rest: "2:00", completed: false },
          { weight: 220, reps: 10, rest: "2:00", completed: false }
        ],
        bestWeight: 200,
        bestReps: 12
      },
      {
        machine: "Leg Curl",
        region: "Legs",
        feel: "Medium",
        sets: [
          { weight: 50, reps: 15, rest: "1:00", completed: false },
          { weight: 60, reps: 12, rest: "1:00", completed: false },
          { weight: 65, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 60,
        bestReps: 12
      }
    ],
    abs: [
      { name: "Bicycle Crunches", reps: 40 },
      { name: "Mountain Climbers", reps: 30 },
      { name: "Dead Bug", reps: 20 }
    ]
  },
  "Chest, Tricep Focus": {
    exercises: [
      {
        machine: "Bench Press",
        region: "Chest Pecs",
        feel: "Hard",
        sets: [
          { weight: 95, reps: 12, rest: "2:00", completed: false },
          { weight: 105, reps: 10, rest: "2:00", completed: false },
          { weight: 115, reps: 8, rest: "2:00", completed: false }
        ],
        bestWeight: 105,
        bestReps: 10
      },
      {
        machine: "Incline Dumbbell Press",
        region: "Chest Pecs",
        feel: "Hard",
        sets: [
          { weight: 45, reps: 12, rest: "1:30", completed: false },
          { weight: 50, reps: 10, rest: "1:30", completed: false },
          { weight: 55, reps: 8, rest: "1:30", completed: false }
        ],
        bestWeight: 48,
        bestReps: 10
      },
      {
        machine: "Tricep Dips",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 0, reps: 15, rest: "1:00", completed: false },
          { weight: 0, reps: 12, rest: "1:00", completed: false },
          { weight: 0, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 0,
        bestReps: 12
      },
      {
        machine: "Tricep Pushdown",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 40, reps: 15, rest: "1:00", completed: false },
          { weight: 50, reps: 12, rest: "1:00", completed: false },
          { weight: 55, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 50,
        bestReps: 12
      }
    ],
    abs: [
      { name: "Hanging Knee Raises", reps: 15 },
      { name: "Plank to Push-up", reps: 10 },
      { name: "Side Plank", time: "0:30" }
    ]
  },
  "Back, Biceps, and Legs": {
    exercises: [
      {
        machine: "Pull-ups",
        region: "Back",
        feel: "Hard",
        sets: [
          { weight: 0, reps: 8, rest: "1:30", completed: false },
          { weight: 0, reps: 6, rest: "1:30", completed: false },
          { weight: 0, reps: 5, rest: "1:30", completed: false }
        ],
        bestWeight: 0,
        bestReps: 8
      },
      {
        machine: "Barbell Rows",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 75, reps: 12, rest: "1:00", completed: false },
          { weight: 85, reps: 10, rest: "1:00", completed: false },
          { weight: 95, reps: 8, rest: "1:00", completed: false }
        ],
        bestWeight: 85,
        bestReps: 10
      },
      {
        machine: "Bicep Curls",
        region: "Biceps",
        feel: "Medium",
        sets: [
          { weight: 25, reps: 15, rest: "1:00", completed: false },
          { weight: 30, reps: 12, rest: "1:00", completed: false },
          { weight: 35, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 30,
        bestReps: 12
      },
      {
        machine: "Squats",
        region: "Legs",
        feel: "Hard",
        sets: [
          { weight: 85, reps: 15, rest: "2:00", completed: false },
          { weight: 95, reps: 12, rest: "2:00", completed: false },
          { weight: 105, reps: 10, rest: "2:00", completed: false }
        ],
        bestWeight: 95,
        bestReps: 12
      }
    ],
    abs: [
      { name: "Reverse Crunches", reps: 25 },
      { name: "Leg Raises", reps: 15 },
      { name: "Plank", time: "1:00" }
    ]
  },
  "Chest, Shoulders, and Back": {
    exercises: [
      {
        machine: "Chest Fly Machine",
        region: "Chest Pecs",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 15, rest: "1:00", completed: false },
          { weight: 70, reps: 12, rest: "1:00", completed: false },
          { weight: 75, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 70,
        bestReps: 12
      },
      {
        machine: "Overhead Press",
        region: "Shoulders",
        feel: "Hard",
        sets: [
          { weight: 45, reps: 12, rest: "1:30", completed: false },
          { weight: 55, reps: 10, rest: "1:30", completed: false },
          { weight: 65, reps: 8, rest: "1:30", completed: false }
        ],
        bestWeight: 55,
        bestReps: 10
      },
      {
        machine: "T-Bar Row",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 70, reps: 12, rest: "1:00", completed: false },
          { weight: 80, reps: 10, rest: "1:00", completed: false },
          { weight: 90, reps: 8, rest: "1:00", completed: false }
        ],
        bestWeight: 80,
        bestReps: 10
      },
      {
        machine: "Face Pulls",
        region: "Shoulders",
        feel: "Light",
        sets: [
          { weight: 30, reps: 20, rest: "45", completed: false },
          { weight: 35, reps: 15, rest: "45", completed: false },
          { weight: 40, reps: 12, rest: "45", completed: false }
        ],
        bestWeight: 35,
        bestReps: 15
      }
    ],
    abs: [
      { name: "Cable Crunches", reps: 20 },
      { name: "Oblique Crunches", reps: 15 },
      { name: "Hollow Body Hold", time: "0:30" }
    ]
  }
};

// Generate workout schedule for a given month
export function generateWorkoutSchedule(year: number, month: number): { date: string; type: WorkoutType }[] {
  const schedule: { date: string; type: WorkoutType }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const workoutTypesList = Object.keys(workoutTemplates) as WorkoutType[];
  
  for (let day = 1; day <= daysInMonth; day++) {
    // Skip some days for rest (e.g., every 3rd day)
    if (day % 3 === 0 && day % 7 !== 0) continue;
    
    const date = new Date(year, month - 1, day).toISOString().split('T')[0];
    const typeIndex = Math.floor((day - 1) / 2) % workoutTypesList.length;
    
    schedule.push({
      date,
      type: workoutTypesList[typeIndex]
    });
  }
  
  return schedule;
}

// Get today's workout type
export function getTodaysWorkoutType(): WorkoutType {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const workoutTypesList = Object.keys(workoutTemplates) as WorkoutType[];
  
  return workoutTypesList[dayOfYear % workoutTypesList.length];
}
