import { Exercise, AbsExercise, WorkoutType, ExerciseSet } from "@shared/schema";
import { formatLocalDate } from "@/lib/utils";
import { localWorkoutStorage } from "@/lib/storage";

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
        ],
        bestWeight: 90,
        bestReps: 15
      },
      {
        code: "S5",
        machine: "Converging Chest Press",
        equipment: "machine",
        region: "Chest Pecs",
        feel: "Medium",
        sets: [
          { weight: 100, reps: 15, rest: "1:00" },
          { weight: 115, reps: 10, rest: "1:30" },
          { weight: 115, reps: 10, rest: "1:00" }
        ],
        bestWeight: 115,
        bestReps: 10
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
        ],
        bestWeight: 165,
        bestReps: 15
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
        ],
        bestWeight: 70,
        bestReps: 10
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
        ],
        bestWeight: 25,
        bestReps: 15
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
        ],
        bestWeight: 120,
        bestReps: 10
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
        ],
        bestWeight: 140,
        bestReps: 10
      }
    ],
    abs: [
      { name: "Legs-Up Crunch", reps: 30 },
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
        ],
        bestWeight: 230,
        bestReps: 15
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
        ],
        bestWeight: 450,
        bestReps: 10
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
        ],
        bestWeight: 0,
        bestReps: 20
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
        ],
        bestWeight: 175,
        bestReps: 10
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
        ],
        bestWeight: 185,
        bestReps: 15
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
        ],
        bestWeight: 150,
        bestReps: 10
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
        ],
        bestWeight: 155,
        bestReps: 10
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
        ],
        bestWeight: 140,
        bestReps: 10
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
        ],
        bestWeight: 45,
        bestReps: 20
      }
    ],
    abs: [
      { name: "Crunch", reps: 30 },
      { name: "Knee Raise", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Reverse Crunch", reps: 30 },
      { name: "Side Oblique Knee Raise", reps: 30 },
      { name: "Legs-Up Crunch", reps: 30 }
    ]
  },

  "Back & Biceps": {
    exercises: [
      {
        code: "N/A",
        machine: "Wide Grip Pulldown (front)",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 135, reps: 10, rest: "1:00" },
          { weight: 150, reps: 10, rest: "1:00" },
          { weight: 160, reps: 10, rest: "1:00" }
        ],
        bestWeight: 160,
        bestReps: 10
      },
      {
        code: "N/A",
        machine: "Close Grip Pulldown (front)",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 120, reps: 15, rest: "1:30" },
          { weight: 140, reps: 15, rest: "1:30" },
          { weight: 150, reps: 15, rest: "1:30" }
        ],
        bestWeight: 150,
        bestReps: 15
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
        ],
        bestWeight: 200,
        bestReps: 15
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
        ],
        bestWeight: 200,
        bestReps: 20
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
        ],
        bestWeight: 15,
        bestReps: 10
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
        ],
        bestWeight: 70,
        bestReps: 10
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
        ],
        bestWeight: 50,
        bestReps: 10
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
        ],
        bestWeight: 70,
        bestReps: 10
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
        ],
        bestWeight: 15,
        bestReps: 15
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
        ],
        bestWeight: 90,
        bestReps: 15
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
        machine: "Wide Grip Pulldown (front)",
        equipment: "machine",
        region: "Back",
        feel: "Medium",
        sets: [
          { weight: 110, reps: 15, rest: "1:00" },
          { weight: 135, reps: 15, rest: "1:00" },
          { weight: 135, reps: 15, rest: "1:00" }
        ],
        bestWeight: 135,
        bestReps: 15
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
        ],
        bestWeight: 140,
        bestReps: 10
      },
      {
        code: "N/A",
        machine: "Herculean Dabble Curl",
        equipment: "freeweight",
        region: "Biceps",
        feel: "Medium",
        sets: [
          { weight: 40, reps: 10, rest: "1:30" },
          { weight: 40, reps: 10, rest: "1:30" },
          { weight: 40, reps: 10, rest: "1:30" }
        ],
        bestWeight: 40,
        bestReps: 10
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
        ],
        bestWeight: 90,
        bestReps: 10
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
        ],
        bestWeight: 70,
        bestReps: 15
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
        ],
        bestWeight: 200,
        bestReps: 20
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
        ],
        bestWeight: 160,
        bestReps: 10
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
        ],
        bestWeight: 400,
        bestReps: 15
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
        ],
        bestWeight: 130,
        bestReps: 15
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
        ],
        bestWeight: 45,
        bestReps: 15
      }
    ],
    abs: [
      { name: "Crunch", reps: 30 },
      { name: "Jack Knife", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Straight Leg Thrust", reps: 30 },
      { name: "Side Oblique Leg Raise", reps: 30 },
      { name: "Legs-In Crunch", reps: 30 }
    ]
  },

  "Chest & Triceps": {
    exercises: [
      {
        code: "N/A",
        machine: "Seated Chest Press",
        equipment: "both",
        region: "Chest",
        feel: "Medium",
        sets: [
          { weight: 75, reps: 15, rest: "1:00" },
          { weight: 100, reps: 15, rest: "1:00" },
          { weight: 100, reps: 15, rest: "1:00" }
        ],
        bestWeight: 100,
        bestReps: 15
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
        ],
        bestWeight: 80,
        bestReps: 6
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
        ],
        bestWeight: 15,
        bestReps: 15
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
        ],
        bestWeight: 150,
        bestReps: 10
      },
      {
        code: "N/A",
        machine: "Low-Pulley Kick Back",
        equipment: "machine",
        region: "Triceps",
        feel: "Medium",
        sets: [
          { weight: 50, reps: 10, rest: "1:30" },
          { weight: 50, reps: 10, rest: "1:30" },
          { weight: 50, reps: 10, rest: "1:30" }
        ],
        bestWeight: 50,
        bestReps: 10
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
        ],
        bestWeight: 15,
        bestReps: 10
      }
    ],
    abs: [
      { name: "Legs-In Crunch", reps: 30 },
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
        equipment: "both",
        region: "Chest",
        feel: "Medium",
        sets: [
          { weight: 75, reps: 10, rest: "1:00" },
          { weight: 100, reps: 10, rest: "1:00" },
          { weight: 100, reps: 10, rest: "1:00" }
        ],
        bestWeight: 100,
        bestReps: 10
      },
      {
        code: "N/A",
        machine: "Push Up (on Knees)",
        equipment: "freeweight",
        region: "Chest",
        feel: "Light",
        sets: [
          { weight: 0, reps: 10, rest: "1:00" },
          { weight: 0, reps: 10, rest: "1:00" },
          { weight: 0, reps: 10, rest: "1:00" }
        ],
        bestWeight: 0,
        bestReps: 10
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
        ],
        bestWeight: 100,
        bestReps: 10
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
        ],
        bestWeight: 30,
        bestReps: 10
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
        ],
        bestWeight: 70,
        bestReps: 10
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
        ],
        bestWeight: 65,
        bestReps: 10
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
        ],
        bestWeight: 135,
        bestReps: 10
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
        ],
        bestWeight: 200,
        bestReps: 10
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
        ],
        bestWeight: 70,
        bestReps: 10
      }
    ],
    abs: [
      { name: "Crunch", reps: 30 },
      { name: "Jack Knife", reps: 30 },
      { name: "Side Oblique Knee Raise", reps: 30 },
      { name: "Reverse Crunch", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Legs-Up Crunch", reps: 30 }
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
        ],
        bestWeight: 90,
        bestReps: 15
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
        ],
        bestWeight: 30,
        bestReps: 15
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
        ],
        bestWeight: 70,
        bestReps: 15
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
        ],
        bestWeight: 200,
        bestReps: 10
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
        ],
        bestWeight: 200,
        bestReps: 10
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
        ],
        bestWeight: 165,
        bestReps: 15
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
        ],
        bestWeight: 130,
        bestReps: 15
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
        ],
        bestWeight: 45,
        bestReps: 15
      }
    ],
    abs: [
      { name: "Crunch", reps: 30 },
      { name: "Straight Leg Thrust", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Straight Leg Thrust", reps: 30 },
      { name: "Side Oblique Crunch", reps: 30 },
      { name: "Legs-In Crunch", reps: 30 }
    ]
  }
};

// Default 14-day workout cycle
export const defaultWorkoutCycle: string[] = [
  "Chest & Triceps",
  "Back & Biceps",
  "Legs",
  "Chest & Shoulders",
  "Back, Biceps & Legs",
  "Chest Day",
  "Back & Biceps",
  "Chest, Shoulders & Legs",
  "Legs",
  "Chest & Triceps",
  "Back, Biceps & Legs",
  "Chest & Shoulders",
  "Back & Biceps",
  "Chest, Shoulders & Legs"
];

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

  return [...presets, ...customs];
}

// Generate workout schedule for a given month
export function generateWorkoutSchedule(year: number, month: number): { date: string; type: string }[] {
  const schedule: { date: string; type: string }[] = [];
  const cycle = getWorkoutCycle();
  const daysInMonth = new Date(year, month, 0).getDate();

  const baseDay = Date.UTC(1970, 0, 1) / 86400000;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(year, month - 1, day);
    const dayIndex = Math.floor(Date.UTC(year, month - 1, day) / 86400000) - baseDay;
    const typeIndex = dayIndex % cycle.length;

    schedule.push({
      date: formatLocalDate(dateObj),
      type: cycle[typeIndex]
    });
  }

  return schedule;
}

// Get today's workout type
export function getTodaysWorkoutType(): string {
  const today = new Date();

  const baseDay = Date.UTC(1970, 0, 1) / 86400000;
  const dayIndex = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000) - baseDay;
  const cycle = getWorkoutCycle();
  return cycle[dayIndex % cycle.length];
}
