import { BASE_POINTS, ROUND_DURATION_SECONDS, COUNTDOWN_SECONDS } from './constants';

export function calculateScore(finishTimeSeconds: number | null): number {
  if (finishTimeSeconds === null) return 0;
  // Scale scoring: 0 seconds = BASE_POINTS, max time (180s) = 0 points
  const maxPlayTime = ROUND_DURATION_SECONDS - COUNTDOWN_SECONDS; // 180 seconds
  const scaledTime = finishTimeSeconds * (BASE_POINTS / maxPlayTime);
  return Math.max(0, BASE_POINTS - Math.floor(scaledTime));
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
