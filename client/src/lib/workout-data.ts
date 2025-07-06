import { Exercise, AbsExercise, WorkoutType } from "@shared/schema";

// Workout templates for different focus types
export const workoutTemplates: Record<WorkoutType, {
  exercises: Omit<Exercise, 'completed'>[];
  abs: Omit<AbsExercise, 'completed'>[];
}> = {
  "Chest Day (ActiveTrax)": {
    exercises: [
      {
        code: "S24",
        machine: "Adjustable Cable Crossover",
        region: "Chest Pecs",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 15, rest: "1:00", completed: false },
          { weight: 70, reps: 15, rest: "1:00", completed: false },
          { weight: 90, reps: 15, rest: "1:00", completed: false }
        ],
        bestWeight: 90,
        bestReps: 15
      },
      {
        code: "S5",
        machine: "Converging Chest Press",
        region: "Chest Pecs",
        feel: "Medium",
        sets: [
          { weight: 100, reps: 15, rest: "1:00", completed: false },
          { weight: 115, reps: 10, rest: "1:30", completed: false },
          { weight: 115, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 115,
        bestReps: 10
      },
      {
        code: "S4",
        machine: "Rear Delt / Pec Fly",
        region: "Outer Pecs",
        feel: "Medium",
        sets: [
          { weight: 160, reps: 15, rest: "1:00", completed: false },
          { weight: 160, reps: 15, rest: "1:00", completed: false },
          { weight: 165, reps: 15, rest: "1:00", completed: false }
        ],
        bestWeight: 165,
        bestReps: 15
      },
      {
        code: "S12",
        machine: "Lateral Raise",
        region: "Shoulders",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 15, rest: "1:00", completed: false },
          { weight: 70, reps: 10, rest: "1:00", completed: false },
          { weight: 70, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 70,
        bestReps: 10
      },
      {
        code: "S33",
        machine: "90-Degree Utility Seat",
        region: "Shoulders",
        feel: "Light",
        sets: [
          { weight: 25, reps: 15, rest: "1:00", completed: false },
          { weight: 25, reps: 15, rest: "1:00", completed: false },
          { weight: 25, reps: 15, rest: "1:00", completed: false }
        ],
        bestWeight: 25,
        bestReps: 15
      },
      {
        code: "S24",
        machine: "Adj. Hi/Low Pulley",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 100, reps: 15, rest: "1:00", completed: false },
          { weight: 120, reps: 10, rest: "1:30", completed: false },
          { weight: 120, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 120,
        bestReps: 10
      },
      {
        code: "S8",
        machine: "Seated Dip",
        region: "Outer Triceps",
        feel: "Medium",
        sets: [
          { weight: 125, reps: 15, rest: "1:00", completed: false },
          { weight: 140, reps: 10, rest: "1:00", completed: false },
          { weight: 140, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 140,
        bestReps: 10
      }
    ],
    abs: [
      { name: "Crunch with Legs Elevated", reps: 30 },
      { name: "Jack Knife", reps: 30 },
      { name: "Side Oblique Crunch with Legs Vertical", reps: 30 },
      { name: "Decline 90 Degree Reverse Crunch", reps: 30 },
      { name: "Side Oblique Crunch with Arms Extended", reps: 30 }
    ]
  },
  // ... keep your existing workouts below or above this block
};

// Generate workout schedule for a given month
export function generateWorkoutSchedule(year: number, month: number): { date: string; type: WorkoutType }[] {
  const schedule: { date: string; type: WorkoutType }[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  const workoutTypesList = Object.keys(workoutTemplates) as WorkoutType[];

  for (let day = 1; day <= daysInMonth; day++) {
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
