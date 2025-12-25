import type { Point, Line } from '../types';

/**
 * Generate a unique ID for a line
 */
export function generateLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Catmull-Rom spline interpolation
 * Creates smooth curves through control points
 */
function catmullRomSpline(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number
): Point {
  const t2 = t * t;
  const t3 = t2 * t;

  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  return { x, y };
}

/**
 * Smooth a line using Catmull-Rom spline interpolation
 * Returns evenly-spaced points along the smooth curve
 */
export function smoothLineWithSpline(points: Point[], segmentLength: number = 5): Point[] {
  if (points.length < 2) return points;
  if (points.length === 2) return points;

  const smoothed: Point[] = [];

  // For each segment between original points
  for (let i = 0; i < points.length - 1; i++) {
    // Get 4 control points for Catmull-Rom (with clamping at edges)
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    // Calculate segment length to determine samples
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const numSamples = Math.max(2, Math.ceil(dist / segmentLength));

    // Sample the spline
    for (let j = 0; j < numSamples; j++) {
      const t = j / numSamples;
      smoothed.push(catmullRomSpline(p0, p1, p2, p3, t));
    }
  }

  // Add the final point
  smoothed.push(points[points.length - 1]);

  return smoothed;
}

/**
 * Simplify a line using the Ramer-Douglas-Peucker algorithm
 * This reduces the number of points while preserving the shape
 */
export function simplifyLine(points: Point[], epsilon: number = 2): Point[] {
  if (points.length < 3) return points;

  // Find the point with the maximum distance from the line segment
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

  // If max distance is greater than epsilon, recursively simplify
  if (maxDistance > epsilon) {
    const left = simplifyLine(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyLine(points.slice(maxIndex), epsilon);

    // Combine results (removing duplicate point at junction)
    return [...left.slice(0, -1), ...right];
  } else {
    // Return just the endpoints
    return [first, last];
  }
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    // Line segment is a point
    return Math.sqrt(
      Math.pow(point.x - lineStart.x, 2) + Math.pow(point.y - lineStart.y, 2)
    );
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
        (dx * dx + dy * dy)
    )
  );

  const projX = lineStart.x + t * dx;
  const projY = lineStart.y + t * dy;

  return Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));
}

/**
 * Check if a point is near a line (for eraser tool)
 */
export function isPointNearLine(
  point: Point,
  line: Line,
  threshold: number = 10
): boolean {
  for (let i = 0; i < line.points.length - 1; i++) {
    const distance = perpendicularDistance(
      point,
      line.points[i],
      line.points[i + 1]
    );
    if (distance <= threshold) {
      return true;
    }
  }
  return false;
}

/**
 * Create a new line from points
 */
export function createLine(points: Point[]): Line {
  return {
    id: generateLineId(),
    points: simplifyLine(points),
  };
}

