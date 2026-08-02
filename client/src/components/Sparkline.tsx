interface SparklineProps {
  /** Oldest first. */
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * The shape of a number over time. No axes, no gridlines, no labels, no
 * library.
 *
 * Deliberately not a chart. It sits beside a sentence that already says what
 * happened — "125 lbs, up 45 since Jul 2025" — so its whole job is to show the
 * shape of getting there. Anything more would be decoration competing with the
 * text for the same job, and this app removed 54 dependencies rather than keep
 * a charting one.
 *
 * Inherits `currentColor`, so it takes the colour of whatever it sits in and
 * needs no dark-mode handling of its own.
 */
export function Sparkline({ values, width = 64, height = 20, className }: SparklineProps) {
  if (values.length === 0) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min;

  // Inset by the stroke so the line is never clipped at the extremes.
  const pad = 1.5;
  const usableW = width - pad * 2;
  const usableH = height - pad * 2;

  const x = (i: number) =>
    values.length === 1 ? width / 2 : pad + (i / (values.length - 1)) * usableW;

  // A flat run has no span to divide by; draw it down the middle rather than
  // at the top, which is what a naive normalisation does.
  const y = (v: number) => (span === 0 ? height / 2 : pad + (1 - (v - min) / span) * usableH);

  if (values.length === 1) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true">
        <circle cx={x(0)} cy={y(values[0])} r={2} fill="currentColor" />
      </svg>
    );
  }

  const d = values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden="true"
    >
      <path
        d={d}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Where you are now, so the eye lands on the end of the line. */}
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r={2} fill="currentColor" />
    </svg>
  );
}
