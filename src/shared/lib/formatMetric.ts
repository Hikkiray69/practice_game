export function formatMetric(value: number): string {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}
