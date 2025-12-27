export interface Point {
  x: number;
  y: number;
}

export interface StaticObstacle {
  id: string;
  type: 'mountain-peak' | 'rock-formation' | 'tree' | 'structure';
  position: Point;
  bounds: { width: number; height: number };
  shape: 'rectangle' | 'circle' | 'polygon';
  vertices?: Point[];
}

export interface MovementPattern {
  type: 'linear' | 'circular' | 'oscillate' | 'figure8';
  speed: number;
  amplitude?: number;
  frequency?: number;
  radius?: number;
  direction: 'horizontal' | 'vertical' | 'diagonal';
  path?: Point[];
}

export interface MovingObstacle {
  id: string;
  type: 'ski-lift' | 'rising-peak' | 'platform' | 'island' | 'slalom-flags' | 'chalet';
  basePosition: Point;
  bounds: { width: number; height: number };
  movement: MovementPattern;
  collisionType: 'full' | 'pass-through-cable';
  cablePath?: { start: Point; end: Point };
}

export interface WindZone {
  id: string;
  position: Point;
  bounds: { width: number; height: number };
  direction: 'left' | 'right';
  strength: number;
  shape: 'vertical-column' | 'horizontal-band';
}

export interface NarrowPassage {
  id: string;
  position: Point;
  width: number;
  height: number;
  bounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  type: 'static-gap' | 'dynamic-gap' | 'terrain-gate' | 'slalom';
}

export interface Level {
  id: string;
  start: Point;
  finish: Point;
  staticObstacles: StaticObstacle[];
  movingObstacles: MovingObstacle[];
  windZones: WindZone[];
  narrowPassages: NarrowPassage[];
  difficulty: 'easy' | 'medium' | 'hard';
}

const LEVEL_BOUNDS = {
  maxWidth: 2000,
  maxHeight: 1500,
  minSeparation: 0.33,
};

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isPointInBounds(point: Point, bounds: { left: number; right: number; top: number; bottom: number }): boolean {
  return point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
}

function getObstacleBounds(obstacle: StaticObstacle): { left: number; right: number; top: number; bottom: number } {
  return {
    left: obstacle.position.x - obstacle.bounds.width / 2,
    right: obstacle.position.x + obstacle.bounds.width / 2,
    top: obstacle.position.y - obstacle.bounds.height / 2,
    bottom: obstacle.position.y + obstacle.bounds.height / 2,
  };
}

function checkOverlap(
  pos: Point,
  size: { width: number; height: number },
  obstacles: StaticObstacle[],
  minDistance: number = 100
): boolean {
  for (const obs of obstacles) {
    const obsBounds = getObstacleBounds(obs);
    const newBounds = {
      left: pos.x - size.width / 2,
      right: pos.x + size.width / 2,
      top: pos.y - size.height / 2,
      bottom: pos.y + size.height / 2,
    };

    if (
      newBounds.right >= obsBounds.left - minDistance &&
      newBounds.left <= obsBounds.right + minDistance &&
      newBounds.bottom >= obsBounds.top - minDistance &&
      newBounds.top <= obsBounds.bottom + minDistance
    ) {
      return true;
    }
  }
  return false;
}

function generateStaticObstacles(
  start: Point,
  finish: Point,
  difficulty: 'easy' | 'medium' | 'hard'
): StaticObstacle[] {
  const obstacles: StaticObstacle[] = [];
  const counts = { easy: 3, medium: 5, hard: 8 };
  const count = counts[difficulty] + Math.floor(Math.random() * 3);

  const minX = Math.min(start.x, finish.x) + 100;
  const maxX = Math.max(start.x, finish.x) - 100;
  const minY = Math.min(start.y, finish.y) + 100;
  const maxY = Math.max(start.y, finish.y) - 100;

  const types: StaticObstacle['type'][] = ['mountain-peak', 'rock-formation', 'tree', 'structure'];
  const sizes = [
    { width: 60, height: 80 },
    { width: 80, height: 100 },
    { width: 100, height: 120 },
    { width: 120, height: 150 },
  ];

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let position: Point;
    let size: { width: number; height: number };

    do {
      position = {
        x: randomBetween(minX, maxX),
        y: randomBetween(minY, maxY),
      };
      size = sizes[Math.floor(Math.random() * sizes.length)];
      attempts++;
    } while (
      (checkOverlap(position, size, obstacles) ||
        distance(position, start) < 150 ||
        distance(position, finish) < 150) &&
      attempts < 50
    );

    if (attempts < 50) {
      obstacles.push({
        id: crypto.randomUUID(),
        type: types[Math.floor(Math.random() * types.length)],
        position,
        bounds: size,
        shape: Math.random() > 0.5 ? 'rectangle' : 'circle',
      });
    }
  }

  return obstacles;
}

function generateMovingObstacles(
  start: Point,
  finish: Point,
  staticObstacles: StaticObstacle[],
  difficulty: 'easy' | 'medium' | 'hard'
): MovingObstacle[] {
  const obstacles: MovingObstacle[] = [];
  const counts = { easy: 1, medium: 2, hard: 3 };
  const count = counts[difficulty] + Math.floor(Math.random() * 2);

  const minX = Math.min(start.x, finish.x) + 150;
  const maxX = Math.max(start.x, finish.x) - 150;
  const minY = Math.min(start.y, finish.y) + 150;
  const maxY = Math.max(start.y, finish.y) - 150;

  const types: MovingObstacle['type'][] = ['ski-lift', 'rising-peak', 'platform', 'island', 'slalom-flags', 'chalet'];
  const speeds = { easy: 50, medium: 100, hard: 150 };

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    let basePosition: Point;
    let bounds: { width: number; height: number };
    let movement: MovementPattern;

    let attempts = 0;
    do {
      basePosition = {
        x: randomBetween(minX, maxX),
        y: randomBetween(minY, maxY),
      };

      if (type === 'ski-lift') {
        bounds = { width: 40, height: 40 };
        const cableLength = randomBetween(200, 400);
        const angle = Math.random() * Math.PI * 2;
        movement = {
          type: 'linear',
          speed: speeds[difficulty],
          direction: 'diagonal',
          path: [
            basePosition,
            {
              x: basePosition.x + Math.cos(angle) * cableLength,
              y: basePosition.y + Math.sin(angle) * cableLength,
            },
          ],
        };
      } else if (type === 'rising-peak') {
        bounds = { width: 80, height: 100 };
        movement = {
          type: 'oscillate',
          speed: speeds[difficulty] * 0.5,
          amplitude: randomBetween(50, 200),
          frequency: randomBetween(0.5, 2.0),
          direction: 'vertical',
        };
      } else if (type === 'platform') {
        bounds = { width: 100, height: 20 };
        movement = {
          type: 'oscillate',
          speed: speeds[difficulty] * 0.6,
          amplitude: randomBetween(100, 250),
          frequency: randomBetween(0.3, 1.5),
          direction: 'vertical',
        };
      } else if (type === 'island') {
        bounds = { width: 120, height: 80 };
        movement = {
          type: 'circular',
          speed: speeds[difficulty] * 0.4,
          radius: randomBetween(80, 150),
          direction: 'horizontal',
        };
      } else if (type === 'slalom-flags') {
        bounds = { width: 200, height: 40 };
        movement = {
          type: 'linear',
          speed: speeds[difficulty] * 0.3,
          direction: 'horizontal',
        };
      } else {
        bounds = { width: 150, height: 120 };
        movement = {
          type: 'circular',
          speed: speeds[difficulty] * 0.5,
          radius: randomBetween(100, 200),
          direction: 'horizontal',
        };
      }

      attempts++;
    } while (
      checkOverlap(basePosition, bounds, staticObstacles, 120) &&
      attempts < 30
    );

    if (attempts < 30) {
      obstacles.push({
        id: crypto.randomUUID(),
        type,
        basePosition,
        bounds,
        movement,
        collisionType: type === 'ski-lift' ? 'pass-through-cable' : 'full',
        cablePath:
          type === 'ski-lift' && movement.path
            ? { start: movement.path[0], end: movement.path[1] }
            : undefined,
      });
    }
  }

  return obstacles;
}

function generateWindZones(
  start: Point,
  finish: Point,
  difficulty: 'easy' | 'medium' | 'hard'
): WindZone[] {
  const zones: WindZone[] = [];
  const counts = { easy: 2, medium: 3, hard: 5 };
  const count = counts[difficulty];

  const minX = Math.min(start.x, finish.x);
  const maxX = Math.max(start.x, finish.x);
  const minY = Math.min(start.y, finish.y);
  const maxY = Math.max(start.y, finish.y);

  const strengths = { easy: 0.35, medium: 0.6, hard: 1.0 }; // Reduced wind intensity

  for (let i = 0; i < count; i++) {
    const shape: WindZone['shape'] = Math.random() > 0.5 ? 'vertical-column' : 'horizontal-band';
    let position: Point;
    let bounds: { width: number; height: number };

    if (shape === 'vertical-column') {
      const width = randomBetween(100, 300);
      position = {
        x: randomBetween(minX + width / 2, maxX - width / 2),
        y: (minY + maxY) / 2,
      };
      bounds = { width, height: maxY - minY };
    } else {
      const height = randomBetween(100, 200);
      position = {
        x: (minX + maxX) / 2,
        y: randomBetween(minY + height / 2, maxY - height / 2),
      };
      bounds = { width: maxX - minX, height };
    }

    zones.push({
      id: crypto.randomUUID(),
      position,
      bounds,
      direction: Math.random() > 0.5 ? 'left' : 'right',
      strength: strengths[difficulty] + (Math.random() - 0.5) * 0.5,
      shape,
    });
  }

  return zones;
}

function generateNarrowPassages(
  staticObstacles: StaticObstacle[],
  minWidth: number = 50
): NarrowPassage[] {
  const passages: NarrowPassage[] = [];

  if (staticObstacles.length < 2) return passages;

  const sorted = [...staticObstacles].sort((a, b) => a.position.x - b.position.x);

  for (let i = 0; i < sorted.length - 1; i++) {
    const left = getObstacleBounds(sorted[i]);
    const right = getObstacleBounds(sorted[i + 1]);

    const gapLeft = left.right;
    const gapRight = right.left;
    const gapWidth = gapRight - gapLeft;

    if (gapWidth >= minWidth) {
      const top = Math.max(left.top, right.top);
      const bottom = Math.min(left.bottom, right.bottom);
      const gapHeight = bottom - top;

      if (gapHeight >= 100) {
        passages.push({
          id: crypto.randomUUID(),
          position: {
            x: (gapLeft + gapRight) / 2,
            y: (top + bottom) / 2,
          },
          width: gapWidth,
          height: gapHeight,
          bounds: {
            left: gapLeft,
            right: gapRight,
            top,
            bottom,
          },
          type: 'static-gap',
        });
      }
    }
  }

  return passages;
}

export function generateLevel(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Level {
  const { maxWidth, maxHeight, minSeparation } = LEVEL_BOUNDS;

  const startX = randomBetween(maxWidth * 0.2, maxWidth * 0.8);
  const startY = randomBetween(50, maxHeight * 0.3);

  const minFinishY = startY + maxHeight * minSeparation;
  const finishY = randomBetween(minFinishY, maxHeight * 0.9);

  const horizontalDirection = Math.random() > 0.5 ? 1 : -1;
  const horizontalOffset = randomBetween(maxWidth * 0.1, maxWidth * 0.4);
  const finishX = clamp(startX + horizontalDirection * horizontalOffset, 100, maxWidth - 100);

  const start: Point = { x: startX, y: startY };
  const finish: Point = { x: finishX, y: finishY };

  const staticObstacles = generateStaticObstacles(start, finish, difficulty);
  const narrowPassages = generateNarrowPassages(staticObstacles);
  const movingObstacles = generateMovingObstacles(start, finish, staticObstacles, difficulty);
  const windZones = generateWindZones(start, finish, difficulty);

  return {
    id: crypto.randomUUID(),
    start,
    finish,
    staticObstacles,
    movingObstacles,
    windZones,
    narrowPassages,
    difficulty,
  };
}
