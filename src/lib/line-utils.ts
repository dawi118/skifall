import type { Point, Line } from '../types';

function generateLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function catmullRomSpline(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  };
}

export function smoothLineWithSpline(points: Point[], segmentLength = 5): Point[] {
  if (points.length < 3) return points;

  const smoothed: Point[] = [];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const numSamples = Math.max(2, Math.ceil(dist / segmentLength));

    for (let j = 0; j < numSamples; j++) {
      smoothed.push(catmullRomSpline(p0, p1, p2, p3, j / numSamples));
    }
  }

  smoothed.push(points[points.length - 1]);
  return smoothed;
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return Math.sqrt((point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2);
  }

  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy)));
  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}

function simplifyLine(points: Point[], epsilon = 2): Point[] {
  if (points.length < 3) return points;

  const first = points[0];
  const last = points[points.length - 1];
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = simplifyLine(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyLine(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

export function isPointNearLine(point: Point, line: Line, threshold = 10): boolean {
  for (let i = 0; i < line.points.length - 1; i++) {
    if (perpendicularDistance(point, line.points[i], line.points[i + 1]) <= threshold) {
      return true;
    }
  }
  return false;
}

export function createLine(points: Point[]): Line {
  return {
    id: generateLineId(),
    points: simplifyLine(points),
  };
}
