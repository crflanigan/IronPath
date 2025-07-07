import { Exercise, AbsExercise, WorkoutType, ExerciseSet } from "@shared/schema";

type TemplateExercise = Omit<Exercise, 'completed' | 'sets'> & {
  sets: Omit<ExerciseSet, 'completed'>[];
};

// Workout templates for different focus types
export const workoutTemplates: Partial<Record<WorkoutType, {
  exercises: TemplateExercise[];
  abs: Omit<AbsExercise, 'completed'>[];
}>> = {
  "Chest Day (ActiveTrax)": {
    exercises: [
      {
        code: "S24",
        machine: "Adjustable Cable Crossover",
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
        machine: "Rear Delt / Pec Fly",
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
        machine: "90-Degree Utility Seat",
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
        machine: "Adj. Hi/Low Pulley",
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
        region: "Quads / Hams",
        feel: "Heavy",
        sets: [
          { weight: 400, reps: 10, rest: "1:30" },
          { weight: 450, reps: 10, rest: "1:00" }
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
          { weight: 0, reps: 20, rest: "1:00" },
          { weight: 0, reps: 20, rest: "1:00" }
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
          { weight: 165, reps: 15, rest: "1:30" },
          { weight: 175, reps: 10, rest: "1:00" }
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
        region: "Inner Thighs",
        feel: "Medium",
        sets: [
          { weight: 150, reps: 10, rest: "1:00" },
          { weight: 150, reps: 10, rest: "1:00" }
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
          { weight: 155, reps: 10, rest: "1:00" },
          { weight: 155, reps: 10, rest: "1:00" }
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
          { weight: 135, reps: 10, rest: "1:00" },
          { weight: 140, reps: 10, rest: "1:00" }
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
          { weight: 45, reps: 20, rest: "1:00" }
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
  },

  "Back & Biceps (ActiveTrax)": {
    exercises: [
      {
        code: "N/A",
        machine: "Wide Grip Pulldown (front)",
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
      { name: "Crunch with Heel Push", reps: 30 },
      { name: "Straight Leg Thrust", reps: 30 },
      { name: "Ball Side Oblique Crunch", reps: 30 },
      { name: "Knee Raise", reps: 30 },
      { name: "Side Oblique Knee Raise", reps: 30 },
      { name: "Ab Wheel", reps: 30 }
    ]
  },

  "Back, Biceps & Legs (ActiveTrax)": {
    exercises: [
      {
        code: "N/A",
        machine: "Wide Grip Pulldown (front)",
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
      { name: "Ab Wheel", reps: 30 },
      { name: "Side Oblique Leg Raise", reps: 30 },
      { name: "Crunch with Arms Extended", reps: 30 }
    ]
  },

  "Chest & Triceps (ActiveTrax)": {
    exercises: [
      {
        code: "N/A",
        machine: "Seated Chest Press",
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
        machine: "Cable Crossover",
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
      { name: "Crunch with Legs In", reps: 30 },
      { name: "Decline 90 Degree Reverse Crunch", reps: 30 },
      { name: "90 Degree Side Oblique Crunch", reps: 30 },
      { name: "Decline Reverse Crunch", reps: 30 },
      { name: "Side Oblique Crunch with Arms Extended", reps: 30 },
      { name: "Ball Crunch", reps: 30 }
    ]
  },

  "Chest & Shoulders (ActiveTrax)": {
    exercises: [
      {
        code: "N/A",
        machine: "Seated Chest Press",
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
      { name: "Crunch", reps: 30 }
    ]
  },
  "Chest, Shoulders & Legs (ActiveTrax)": {
    exercises: [
      {
        code: "N/A",
        machine: "Cable Crossover",
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
      { name: "Ball Crunch", reps: 30 },
      { name: "Decline Straight Leg Thrust", reps: 30 },
      { name: "Decline Side Oblique Crunch", reps: 30 },
      { name: "Straight Leg Lift with Thrust", reps: 30 },
      { name: "Side Oblique Crunch with Heel Push", reps: 30 },
      { name: "Decline Crunch", reps: 30 }
    ]
  }
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
