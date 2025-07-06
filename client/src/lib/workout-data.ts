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

  "Back and Legs": {
    exercises: [
      {
        code: "S36",
        machine: "Seated Leg Press",
        region: "Legs (Warm Up)",
        feel: "N/A",
        sets: [
          { weight: 180, reps: 10, rest: "1:00", completed: false },
          { weight: 220, reps: 15, rest: "1:00", completed: false },
          { weight: 230, reps: 15, rest: "1:00", completed: false }
        ],
        bestWeight: 230,
        bestReps: 15
      },
      {
        code: "S22",
        machine: "45 Degree Leg Press",
        region: "Quads / Hams",
        feel: "Heavy",
        sets: [
          { weight: 400, reps: 10, rest: "1:30", completed: false },
          { weight: 450, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 450,
        bestReps: 10
      },
      {
        code: "N/A",
        machine: "Body Squat",
        region: "Legs",
        feel: "Medium",
        sets: [
          { weight: 0, reps: 20, rest: "1:00", completed: false },
          { weight: 0, reps: 20, rest: "1:00", completed: false }
        ],
        bestWeight: 0,
        bestReps: 20
      },
      {
        code: "S14",
        machine: "Seated Leg Curl",
        region: "Hamstrings",
        feel: "Medium",
        sets: [
          { weight: 165, reps: 15, rest: "1:30", completed: false },
          { weight: 175, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 175,
        bestReps: 10
      },
      {
        code: "S15",
        machine: "Seated Leg Extension",
        region: "Quads",
        feel: "Medium",
        sets: [
          { weight: 160, reps: 15, rest: "1:00", completed: false },
          { weight: 170, reps: 15, rest: "1:00", completed: false },
          { weight: 185, reps: 15, rest: "1:00", completed: false }
        ],
        bestWeight: 185,
        bestReps: 15
      },
      {
        code: "S16",
        machine: "Adductor",
        region: "Inner Thighs",
        feel: "Medium",
        sets: [
          { weight: 150, reps: 10, rest: "1:00", completed: false },
          { weight: 150, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 150,
        bestReps: 10
      },
      {
        code: "S18",
        machine: "Abductor",
        region: "Outer Thighs",
        feel: "Medium",
        sets: [
          { weight: 155, reps: 10, rest: "1:00", completed: false },
          { weight: 155, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 155,
        bestReps: 10
      },
      {
        code: "S17",
        machine: "Glute Machine",
        region: "Glutes",
        feel: "Medium",
        sets: [
          { weight: 135, reps: 10, rest: "1:00", completed: false },
          { weight: 140, reps: 10, rest: "1:00", completed: false }
        ],
        bestWeight: 140,
        bestReps: 10
      },
      {
        code: "S3",
        machine: "Standing Calf Raise (1-DB)",
        region: "Calves",
        feel: "Medium",
        sets: [
          { weight: 45, reps: 20, rest: "1:00", completed: false }
        ],
        bestWeight: 45,
        bestReps: 20
      }
    ],
    abs: [
      { name: "Crunch with Heel Push", reps: 30 },
      { name: "Knee Raise (Vertical Chair)", reps: 30 },
      { name: "Decline Side Oblique Crunch (Floor)", reps: 30 },
      { name: "Reverse Crunch", reps: 30 },
      { name: "Side Oblique Ab Wheel", reps: 30 },
      { name: "90 Degree Crunch", reps: 30 }
    ]
  }

  // you can continue adding more templates below
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
