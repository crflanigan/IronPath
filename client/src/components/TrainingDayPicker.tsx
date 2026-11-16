const DAYS = [
  { short: 'S', long: 'Sunday' },
  { short: 'M', long: 'Monday' },
  { short: 'T', long: 'Tuesday' },
  { short: 'W', long: 'Wednesday' },
  { short: 'T', long: 'Thursday' },
  { short: 'F', long: 'Friday' },
  { short: 'S', long: 'Saturday' },
];

/**
 * Seven round toggles, one per weekday.
 *
 * Shared by the welcome tour and the Training Days dialog so the question
 * looks the same wherever it is asked. The last selected day cannot be turned
 * off: a week with no training days has no schedule to draw.
 */
export function TrainingDayPicker({
  value,
  onChange,
}: {
  value: number[];
  onChange: (days: number[]) => void;
}) {
  const toggle = (day: number) => {
    if (value.includes(day)) {
      if (value.length === 1) return;
      onChange(value.filter(d => d !== day));
    } else {
      onChange([...value, day].sort());
    }
  };

  return (
    <div className="flex justify-between gap-1.5" role="group" aria-label="Training days">
      {DAYS.map((day, index) => {
        const on = value.includes(index);
        return (
          <button
            key={day.long}
            type="button"
            aria-label={day.long}
            aria-pressed={on}
            onClick={() => toggle(index)}
            className={`nums flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-all duration-150 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              on
                ? 'bg-brand text-primary-foreground shadow-glow'
                : 'bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500'
            }`}
          >
            {day.short}
          </button>
        );
      })}
    </div>
  );
}

/** "5 days a week", "Every day" — said back so the choice reads as a plan. */
export function describeTrainingDays(days: number[]): string {
  if (days.length >= 7) return 'Every day';
  return `${days.length} ${days.length === 1 ? 'day' : 'days'} a week`;
}
