export function formatDurationMs(ms: number): string {
  const totalMinutes = Math.ceil(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) return `${minutes} menit`;
  if (minutes <= 0) return `${hours} jam`;
  return `${hours} jam ${minutes} menit`;
}
