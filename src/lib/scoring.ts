import { BASE_POINTS } from './constants';

export function calculateScore(finishTimeSeconds: number | null, skillScore: number = 0): number {
  if (finishTimeSeconds === null) return 0;
  const timeScore = Math.max(0, BASE_POINTS - Math.floor(finishTimeSeconds));
  return timeScore + skillScore;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);

  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  }
  return `${secs}.${ms}s`;
}

export function formatCountdown(seconds: number): string {
  return `${Math.ceil(seconds)}`;
}
