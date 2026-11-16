import type { Exercise, AbsExercise, WorkoutType, ExerciseSet } from "@shared/schema";
import { formatLocalDate } from "@/lib/utils";
import { localWorkoutStorage } from "@/lib/storage";
import { defaultWorkoutCycle } from "@/lib/workout-cycle";

type TemplateExercise = Omit<Exercise, 'completed' | 'sets'> & {
  sets: Omit<ExerciseSet, 'completed'>[];
};

// Workout templates for different focus types
export const workoutTemplates: Partial<Record<WorkoutType, {
  exercises: TemplateExercise[];
  abs: Omit<AbsExercise, 'completed'>[];
}>> = {
  "Chest Day": {
    exercises: [
      {
        code: "S24",
        machine: "Adjustable Cable Crossover",
        equipment: "machine",
        region: "Chest Pecs",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 15, rest: "1:00" },
          { weight: 70, reps: 15, rest: "1:00" },
          { weight: 90, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "S5",
        machine: "Seated Chest Press",
        equipment: "machine",
        region: "Chest Pecs",
        feel: "Medium",
        sets: [
          { weight: 100, reps: 15, rest: "1:00" },
          { weight: 115, reps: 10, rest: "1:30" },
          { weight: 115, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "S4",
        machine: "Pec Fly",
        equipment: "machine",
        region: "Outer Pecs",
        feel: "Medium",
        sets: [
          { weight: 160, reps: 15, rest: "1:00" },
          { weight: 160, reps: 15, rest: "1:00" },
          { weight: 165, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "S12",
        machine: "Lateral Raise",
        equipment: "freeweight",
        region: "Shoulders",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 15, rest: "1:00" },
          { weight: 70, reps: 10, rest: "1:00" },
          { weight: 70, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "S33",
        machine: "Lateral Raise Machine",
        equipment: "machine",
        region: "Shoulders",
        feel: "Light",
        sets: [
          { weight: 25, reps: 15, rest: "1:00" },
          { weight: 25, reps: 15, rest: "1:00" },
          { weight: 25, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "S24",
        machine: "High-Pulley Kick Back",
        equipment: "machine",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 100, reps: 15, rest: "1:00" },
          { weight: 120, reps: 10, rest: "1:30" },
          { weight: 120, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "S8",
        machine: "Seated Dip",
        equipment: "machine",
        region: "Outer Triceps",
        feel: "Medium",
        sets: [
          { weight: 125, reps: 15, rest: "1:00" },
          { weight: 140, reps: 10, rest: "1:00" },
          { weight: 140, reps: 10, rest: "1:00" }
        ]
      }
    ],
    abs: [
      { name: "Legs-Up Vertical Crunch", reps: 30 },
      { name: "Jack Knife", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Reverse Crunch", reps: 30 },
      { name: "Side Oblique Knee Raise", reps: 30 }
    ]
  },

  "Legs": {
    exercises: [
      {
        code: "S36",
        machine: "Seated Leg Press",
        equipment: "machine",
        region: "Legs (Warm Up)",
        feel: "N/A",
        sets: [
          { weight: 180, reps: 10, rest: "1:00" },
          { weight: 220, reps: 15, rest: "1:00" },
          { weight: 230, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "S22",
        machine: "45 Degree Leg Press",
        equipment: "machine",
        region: "Quads / Hams",
        feel: "Heavy",
        sets: [
          { weight: 400, reps: 10, rest: "1:30" },
          { weight: 450, reps: 10, rest: "1:00" },
          { weight: 450, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Body Squat",
        equipment: "freeweight",
        region: "Legs",
        feel: "Medium",
        sets: [
          { weight: 0, reps: 20, rest: "1:00" },
          { weight: 0, reps: 20, rest: "1:00" },
          { weight: 0, reps: 20, rest: "1:00" }
        ]
      },
      {
        code: "S14",
        machine: "Seated Leg Curl",
        equipment: "machine",
        region: "Hamstrings",
        feel: "Medium",
        sets: [
          { weight: 165, reps: 15, rest: "1:30" },
          { weight: 175, reps: 10, rest: "1:00" },
          { weight: 175, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "S15",
        machine: "Seated Leg Extension",
        equipment: "machine",
        region: "Quads",
        feel: "Medium",
        sets: [
          { weight: 160, reps: 15, rest: "1:00" },
          { weight: 170, reps: 15, rest: "1:00" },
          { weight: 185, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "S16",
        machine: "Adductor",
        equipment: "machine",
        region: "Inner Thighs",
        feel: "Medium",
        sets: [
          { weight: 150, reps: 10, rest: "1:00" },
          { weight: 150, reps: 10, rest: "1:00" },
          { weight: 150, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "S18",
        machine: "Abductor",
        equipment: "machine",
        region: "Outer Thighs",
        feel: "Medium",
        sets: [
          { weight: 155, reps: 10, rest: "1:00" },
          { weight: 155, reps: 10, rest: "1:00" },
          { weight: 155, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "S17",
        machine: "Glute Machine",
        equipment: "machine",
        region: "Glutes",
        feel: "Medium",
        sets: [
          { weight: 135, reps: 10, rest: "1:00" },
          { weight: 140, reps: 10, rest: "1:00" },
          { weight: 140, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Calf Raise",
        equipment: "machine",
        region: "Calves",
        feel: "Medium",
        sets: [
          { weight: 0, reps: 12, rest: "1:00" },
          { weight: 0, reps: 12, rest: "1:00" },
          { weight: 0, reps: 12, rest: "1:00" }
        ]
      },
      {
        code: "S3",
        machine: "Standing Calf Raise (1-DB)",
        equipment: "freeweight",
        region: "Calves",
        feel: "Medium",
        sets: [
          { weight: 45, reps: 20, rest: "1:00" },
          { weight: 45, reps: 20, rest: "1:00" },
          { weight: 45, reps: 20, rest: "1:00" }
        ]
      }
    ],
    abs: [
      { name: "Crunch", reps: 30 },
      { name: "Knee Raise", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Reverse Crunch", reps: 30 },
      { name: "Side Oblique Knee Raise", reps: 30 },
      { name: "Legs-Up Vertical Crunch", reps: 30 }
    ]
  },

  "Back & Biceps": {
    exercises: [
      {
        code: "N/A",
        machine: "Wide Grip Pulldown",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 135, reps: 10, rest: "1:00" },
          { weight: 150, reps: 10, rest: "1:00" },
          { weight: 160, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Close Grip Pulldown",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 120, reps: 15, rest: "1:30" },
          { weight: 140, reps: 15, rest: "1:30" },
          { weight: 150, reps: 15, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Row",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 140, reps: 15, rest: "1:30" },
          { weight: 200, reps: 10, rest: "1:30" },
          { weight: 200, reps: 6, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Back Extension",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 200, reps: 20, rest: "1:00" },
          { weight: 200, reps: 20, rest: "1:00" },
          { weight: 200, reps: 20, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Bent Over Rear Deltoid",
        equipment: "freeweight",
        region: "Shoulders",
        feel: "Light",
        sets: [
          { weight: 15, reps: 10, rest: "1:00" },
          { weight: 15, reps: 10, rest: "1:00" },
          { weight: 15, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Low-Pulley Straight Bar Curl",
        equipment: "machine",
        region: "Biceps",
        feel: "Medium",
        sets: [
          { weight: 70, reps: 10, rest: "1:00" },
          { weight: 70, reps: 10, rest: "1:00" },
          { weight: 70, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Low-Pulley 1-Arm Curl",
        equipment: "machine",
        region: "Biceps",
        feel: "Medium",
        sets: [
          { weight: 40, reps: 10, rest: "1:00" },
          { weight: 40, reps: 10, rest: "1:00" },
          { weight: 50, reps: 6, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Shrug",
        equipment: "freeweight",
        region: "Traps",
        feel: "Medium",
        sets: [
          { weight: 55, reps: 10, rest: "1:00" },
          { weight: 70, reps: 10, rest: "1:00" },
          { weight: 70, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Standing Wrist Curl with Extension",
        equipment: "freeweight",
        region: "Forearms",
        feel: "Light",
        sets: [
          { weight: 15, reps: 15, rest: "1:00" },
          { weight: 15, reps: 15, rest: "1:00" },
          { weight: 15, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Bar Curl",
        equipment: "freeweight",
        region: "Biceps",
        feel: "Medium",
        sets: [
          { weight: 90, reps: 15, rest: "1:00" },
          { weight: 90, reps: 15, rest: "1:00" },
          { weight: 90, reps: 15, rest: "1:00" }
        ]
      }
    ],
    abs: [
      { name: "Crunch", reps: 30 },
      { name: "Straight Leg Thrust", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Knee Raise", reps: 30 },
      { name: "Side Oblique Knee Raise", reps: 30 },
      { name: "Reverse Crunch", reps: 30 }
    ]
  },

  "Back, Biceps & Legs": {
    exercises: [
      {
        code: "N/A",
        machine: "Wide Grip Pulldown",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 110, reps: 15, rest: "1:00" },
          { weight: 135, reps: 15, rest: "1:00" },
          { weight: 135, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Row",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 120, reps: 10, rest: "1:00" },
          { weight: 140, reps: 10, rest: "1:00" },
          { weight: 140, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Preacher Curl",
        equipment: "freeweight",
        region: "Biceps",
        feel: "Medium",
        sets: [
          { weight: 40, reps: 10, rest: "1:30" },
          { weight: 40, reps: 10, rest: "1:30" },
          { weight: 40, reps: 10, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Low-Pulley Straight Bar Curl",
        equipment: "machine",
        region: "Biceps",
        feel: "Medium",
        sets: [
          { weight: 70, reps: 10, rest: "1:00" },
          { weight: 90, reps: 10, rest: "1:00" },
          { weight: 90, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "1-Arm Curl with Twist",
        equipment: "freeweight",
        region: "Biceps",
        feel: "Medium",
        sets: [
          { weight: 70, reps: 15, rest: "1:00" },
          { weight: 70, reps: 15, rest: "1:00" },
          { weight: 70, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Back Extension",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 200, reps: 20, rest: "1:00" },
          { weight: 200, reps: 20, rest: "1:00" },
          { weight: 200, reps: 20, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Leg Extension",
        equipment: "machine",
        region: "Quads",
        feel: "Medium",
        sets: [
          { weight: 155, reps: 10, rest: "1:00" },
          { weight: 160, reps: 10, rest: "1:00" },
          { weight: 160, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "45 Degree Leg Press",
        equipment: "machine",
        region: "Quads / Hams",
        feel: "Medium",
        sets: [
          { weight: 380, reps: 15, rest: "1:30" },
          { weight: 400, reps: 10, rest: "1:30" },
          { weight: 400, reps: 10, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Glute Machine",
        equipment: "machine",
        region: "Glutes",
        feel: "Medium",
        sets: [
          { weight: 130, reps: 15, rest: "1:00" },
          { weight: 130, reps: 15, rest: "1:00" },
          { weight: 130, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Calf Raise",
        equipment: "machine",
        region: "Calves",
        feel: "Medium",
        sets: [
          { weight: 0, reps: 12, rest: "1:00" },
          { weight: 0, reps: 12, rest: "1:00" },
          { weight: 0, reps: 12, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Standing 1 Leg (1-DB) Calf Raise",
        equipment: "freeweight",
        region: "Calves",
        feel: "Medium",
        sets: [
          { weight: 45, reps: 15, rest: "1:00" },
          { weight: 45, reps: 15, rest: "1:00" },
          { weight: 45, reps: 15, rest: "1:00" }
        ]
      }
    ],
    abs: [
      { name: "Crunch", reps: 30 },
      { name: "Jack Knife", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Straight Leg Thrust", reps: 30 },
      { name: "Side Oblique Leg Raise", reps: 30 },
      { name: "Cross-Leg Crunch", reps: 30 }
    ]
  },

  "Chest & Triceps": {
    exercises: [
      {
        code: "N/A",
        machine: "Seated Chest Press",
        equipment: "machine",
        region: "Chest",
        feel: "Medium",
        sets: [
          { weight: 75, reps: 15, rest: "1:00" },
          { weight: 100, reps: 15, rest: "1:00" },
          { weight: 100, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Adjustable Cable Crossover",
        equipment: "machine",
        region: "Chest",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 15, rest: "1:00" },
          { weight: 80, reps: 6, rest: "1:00" },
          { weight: 80, reps: 6, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Kick Back",
        equipment: "both",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 15, reps: 15, rest: "1:00" },
          { weight: 15, reps: 15, rest: "1:00" },
          { weight: 15, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Straight Bar Pushdown",
        equipment: "machine",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 140, reps: 10, rest: "1:00" },
          { weight: 140, reps: 10, rest: "1:00" },
          { weight: 150, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "High-Pulley Kick Back",
        equipment: "machine",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 50, reps: 10, rest: "1:30" },
          { weight: 50, reps: 10, rest: "1:30" },
          { weight: 50, reps: 10, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Lateral Raise",
        equipment: "freeweight",
        region: "Shoulders",
        feel: "Medium",
        sets: [
          { weight: 15, reps: 10, rest: "1:00" },
          { weight: 15, reps: 10, rest: "1:00" },
          { weight: 15, reps: 10, rest: "1:00" }
        ]
      }
    ],
    abs: [
      { name: "Cross-Leg Crunch", reps: 30 },
      { name: "Reverse Crunch", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Straight Leg Thrust", reps: 30 },
      { name: "Side Oblique Knee Raise", reps: 30 },
      { name: "Crunch", reps: 30 }
    ]
  },

  "Chest & Shoulders": {
    exercises: [
      {
        code: "N/A",
        machine: "Seated Chest Press",
        equipment: "machine",
        region: "Chest",
        feel: "Medium",
        sets: [
          { weight: 75, reps: 10, rest: "1:00" },
          { weight: 100, reps: 10, rest: "1:00" },
          { weight: 100, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Push Up",
        equipment: "freeweight",
        region: "Chest",
        feel: "Light",
        sets: [
          { weight: 0, reps: 10, rest: "1:00" },
          { weight: 0, reps: 10, rest: "1:00" },
          { weight: 0, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Shoulder Press",
        equipment: "both",
        region: "Shoulders",
        feel: "Medium",
        sets: [
          { weight: 100, reps: 10, rest: "1:00" },
          { weight: 100, reps: 10, rest: "1:00" },
          { weight: 100, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Cable Front Deltoid Raise",
        equipment: "both",
        region: "Shoulders",
        feel: "Medium",
        sets: [
          { weight: 20, reps: 10, rest: "1:30" },
          { weight: 30, reps: 10, rest: "1:30" },
          { weight: 30, reps: 10, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Lateral Raise",
        equipment: "freeweight",
        region: "Shoulders",
        feel: "Medium",
        sets: [
          { weight: 70, reps: 10, rest: "1:30" },
          { weight: 70, reps: 10, rest: "1:30" },
          { weight: 70, reps: 10, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Standing Shrug",
        equipment: "freeweight",
        region: "Traps",
        feel: "Medium",
        sets: [
          { weight: 55, reps: 10, rest: "1:30" },
          { weight: 65, reps: 10, rest: "1:30" },
          { weight: 65, reps: 10, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Standing Barbell Shrug",
        equipment: "freeweight",
        region: "Traps",
        feel: "Medium",
        sets: [
          { weight: 135, reps: 10, rest: "1:00" },
          { weight: 135, reps: 10, rest: "1:00" },
          { weight: 135, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Straight Bar Pushdown",
        equipment: "machine",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 200, reps: 10, rest: "1:00" },
          { weight: 200, reps: 10, rest: "1:00" },
          { weight: 200, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "V-Bar Pushdown",
        equipment: "machine",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 10, rest: "1:00" },
          { weight: 70, reps: 10, rest: "1:00" },
          { weight: 70, reps: 10, rest: "1:00" }
        ]
      }
    ],
    abs: [
      { name: "Crunch", reps: 30 },
      { name: "Jack Knife", reps: 30 },
      { name: "Side Oblique Knee Raise", reps: 30 },
      { name: "Reverse Crunch", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Legs-Up Vertical Crunch", reps: 30 }
    ]
  },
  "Chest, Shoulders & Legs": {
    exercises: [
      {
        code: "N/A",
        machine: "Adjustable Cable Crossover",
        equipment: "machine",
        region: "Chest Pecs",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 15, rest: "1:00" },
          { weight: 80, reps: 8, rest: "1:00" },
          { weight: 90, reps: 6, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Shoulder Press",
        equipment: "machine",
        region: "Shoulders",
        feel: "Medium",
        sets: [
          { weight: 25, reps: 15, rest: "1:00" },
          { weight: 30, reps: 15, rest: "1:00" },
          { weight: 30, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "V-Bar Pushdown",
        equipment: "machine",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 60, reps: 15, rest: "1:00" },
          { weight: 70, reps: 15, rest: "1:00" },
          { weight: 70, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Leg Press",
        equipment: "machine",
        region: "Quads / Hams",
        feel: "Medium",
        sets: [
          { weight: 180, reps: 10, rest: "1:00" },
          { weight: 200, reps: 10, rest: "1:00" },
          { weight: 200, reps: 10, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Leg Extension",
        equipment: "machine",
        region: "Quads",
        feel: "Medium",
        sets: [
          { weight: 170, reps: 10, rest: "1:30" },
          { weight: 170, reps: 10, rest: "1:30" },
          { weight: 200, reps: 8, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Leg Curl",
        equipment: "machine",
        region: "Hamstrings",
        feel: "Medium",
        sets: [
          { weight: 155, reps: 15, rest: "1:30" },
          { weight: 165, reps: 12, rest: "1:30" },
          { weight: 165, reps: 8, rest: "1:30" }
        ]
      },
      {
        code: "N/A",
        machine: "Glute Machine",
        equipment: "machine",
        region: "Glutes",
        feel: "Medium",
        sets: [
          { weight: 130, reps: 15, rest: "1:00" },
          { weight: 130, reps: 15, rest: "1:00" },
          { weight: 130, reps: 15, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Seated Calf Raise",
        equipment: "machine",
        region: "Calves",
        feel: "Medium",
        sets: [
          { weight: 0, reps: 12, rest: "1:00" },
          { weight: 0, reps: 12, rest: "1:00" },
          { weight: 0, reps: 12, rest: "1:00" }
        ]
      },
      {
        code: "N/A",
        machine: "Standing 1 Leg (1-DB) Calf Raise",
        equipment: "freeweight",
        region: "Calves",
        feel: "Medium",
        sets: [
          { weight: 45, reps: 15, rest: "1:00" },
          { weight: 45, reps: 15, rest: "1:00" },
          { weight: 45, reps: 15, rest: "1:00" }
        ]
      }
    ],
    abs: [
      // Two of these six were listed twice, so the block read as four moves
      // with two repeats. The repeats are now the two moves this template
      // never used.
      { name: "Crunch", reps: 30 },
      { name: "Straight Leg Thrust", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Knee Raise", reps: 30 },
      { name: "Reverse Crunch", reps: 30 },
      { name: "Cross-Leg Crunch", reps: 30 }
    ]
  }
};

// The built-in 14-day cycle lives in ./workout-cycle so storage.ts can read it
// without creating an import cycle. Re-exported so existing imports from
// '@/lib/workout-data' keep working.
export { defaultWorkoutCycle };

export function getWorkoutCycle(): string[] {
  const selected = localWorkoutStorage.getAutoScheduleWorkouts();
  const customTemplates = localWorkoutStorage.getCustomTemplatesSync();

  const presets =
    selected.length === 0
      ? defaultWorkoutCycle
      : defaultWorkoutCycle.filter(name => selected.includes(name));

  const customs = customTemplates
    .filter(t =>
      selected.length === 0
        ? t.includeInAutoSchedule
        : selected.includes(t.name)
    )
    .map(t => t.name);

  const cycle = [...presets, ...customs];

  // Every selection can go stale — a template gets renamed or deleted and its
  // stored name no longer resolves. An empty cycle would make `dayIndex %
  // cycle.length` NaN and stamp `type: undefined` across the whole calendar,
  // so fall back to the built-in rotation rather than emit a broken schedule.
  return cycle.length > 0 ? cycle : defaultWorkoutCycle;
}

const EPOCH_DAY = Date.UTC(1970, 0, 1) / 86400000;
/** 1 January 1970 was a Thursday. */
const EPOCH_WEEKDAY = 4;

/**
 * The days of the week someone trains, as `Date#getDay()` numbers.
 *
 * Stored under the streak setting, because that is where it began: "which
 * days count toward my streak" and "which days do I train" are one question.
 * An empty list is treated as every day — a schedule with no training days
 * has nothing to show, and it is far more likely to be a slip than a plan.
 */
export function getTrainingDays(): number[] {
  const days = localWorkoutStorage.getStreakDays().filter(d => d >= 0 && d <= 6);
  const unique = Array.from(new Set(days)).sort();
  return unique.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : unique;
}

/**
 * What the rotation has for one date.
 *
 * The rotation advances once per *training* day, not once per calendar day.
 * It used to index by calendar day, which meant the workouts falling on days
 * you never train were simply never offered: on a 14-step cycle every weekday
 * only ever sees the same two entries. Someone training every day gets exactly
 * the schedule they always had, since then the two counts are the same number.
 *
 * On a rest day `type` is the next training day's workout, so "train anyway"
 * has something sensible to start.
 */
export function scheduleForDate(
  date: Date,
  cycle: string[] = getWorkoutCycle(),
  trainingDays: number[] = getTrainingDays(),
): { type: string; rest: boolean } {
  const dayIndex =
    Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) - EPOCH_DAY;

  let position = dayIndex;
  if (trainingDays.length < 7) {
    // Training days strictly before this date: whole weeks, then the part week.
    const weeks = Math.floor(dayIndex / 7);
    const remainder = ((dayIndex % 7) + 7) % 7;
    let partial = 0;
    for (let i = 0; i < remainder; i++) {
      if (trainingDays.includes((EPOCH_WEEKDAY + i) % 7)) partial++;
    }
    position = weeks * trainingDays.length + partial;
  }

  const index = ((position % cycle.length) + cycle.length) % cycle.length;
  return { type: cycle[index], rest: !trainingDays.includes(date.getDay()) };
}

// Generate workout schedule for a given month
export function generateWorkoutSchedule(
  year: number,
  month: number,
): { date: string; type: string; rest: boolean }[] {
  const cycle = getWorkoutCycle();
  const trainingDays = getTrainingDays();
  const daysInMonth = new Date(year, month, 0).getDate();
  const schedule: { date: string; type: string; rest: boolean }[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day);
    schedule.push({ date: formatLocalDate(dateObj), ...scheduleForDate(dateObj, cycle, trainingDays) });
  }

  return schedule;
}

// Get today's workout type
export function getTodaysWorkoutType(): string {
  return scheduleForDate(new Date()).type;
}
