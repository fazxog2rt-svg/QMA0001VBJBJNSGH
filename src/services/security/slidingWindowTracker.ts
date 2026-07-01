/** Tracks timestamped events per key and checks whether a threshold was exceeded within a time window. */
export class SlidingWindowTracker {
  private readonly events = new Map<string, number[]>();

  /** Records an event for `key` and returns the number of events still within `windowMs`. */
  record(key: string, windowMs: number): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (this.events.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
    timestamps.push(now);
    this.events.set(key, timestamps);
    return timestamps.length;
  }

  reset(key: string): void {
    this.events.delete(key);
  }
}
