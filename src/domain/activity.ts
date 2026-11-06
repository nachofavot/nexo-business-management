import type { ActivityEntry } from './types';

export const MAX_ACTIVITY_ENTRIES = 100;

export function addActivity(
  entries: readonly ActivityEntry[],
  entry: ActivityEntry,
): readonly ActivityEntry[] {
  return [entry, ...entries].slice(0, MAX_ACTIVITY_ENTRIES);
}
