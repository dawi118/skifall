/**
 * Animation utilities for smooth interpolation and transitions.
 */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function isAnimationDone(current: number, target: number, threshold = 0.02): boolean {
  return Math.abs(current - target) < threshold;
}

export function animateToward(
  current: number,
  target: number,
  speed: number
): { value: number; done: boolean } {
  const next = current + (target - current) * speed;
  const done = Math.abs(next - target) < 0.01;
  return { value: done ? target : next, done };
}

export interface Positionable {
  x: number;
  y: number;
  angle: number;
}

export function lerpPositionable(current: Positionable, target: Positionable, t: number): Positionable {
  return {
    x: lerp(current.x, target.x, t),
    y: lerp(current.y, target.y, t),
    angle: lerp(current.angle, target.angle, t),
  };
}

