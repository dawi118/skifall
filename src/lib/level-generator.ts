import type { Point } from '../types';
import { LEVEL_BOUNDS } from './constants';

export interface StaticObstacle {
  id: string;
  type: 'mountain-peak' | 'rock-formation' | 'tree' | 'structure';
  position: Point;
  bounds: { width: number; height: number };
  shape: 'rectangle' | 'circle';
}

export interface WindZone {
  id: string;
  position: Point;
  bounds: { width: number; height: number };
  direction: 'left' | 'right';
  strength: number; // force multiplier (0.5-2.0)
  shape: 'vertical-column' | 'horizontal-band';
}

export interface Level {
  id: string;
  start: Point;
  finish: Point;
  staticObstacles: StaticObstacle[];
  windZones: WindZone[];
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const OBSTACLE_SIZES: Record<StaticObstacle['type'], { width: [number, number]; height: [number, number] }> = {
  'mountain-peak': { width: [120, 150], height: [120, 150] },
  'rock-formation': { width: [60, 80], height: [60, 80] },
  'tree': { width: [45, 50], height: [75, 80] },
  'structure': { width: [90, 100], height: [90, 100] },
};

function generateStaticObstacles(start: Point, finish: Point): StaticObstacle[] {
  const obstacles: StaticObstacle[] = [];
  const levelWidth = Math.abs(finish.x - start.x);
  const levelHeight = finish.y - start.y;
  const levelSize = Math.sqrt(levelWidth * levelWidth + levelHeight * levelHeight);
  
  let obstacleCount = 0;
  if (levelSize < 500) {
    obstacleCount = Math.floor(Math.random() * 3);
  } else if (levelSize < 1000) {
    obstacleCount = 3 + Math.floor(Math.random() * 3);
  } else {
    obstacleCount = 6 + Math.floor(Math.random() * 2);
  }
  
  const obstacleTypes: StaticObstacle['type'][] = ['mountain-peak', 'rock-formation', 'tree', 'structure'];
  
  for (let i = 0; i < obstacleCount; i++) {
    let attempts = 0;
    let placed = false;
    
    while (!placed && attempts < 50) {
      attempts++;
      
      const minX = Math.min(start.x, finish.x) + 100;
      const maxX = Math.max(start.x, finish.x) - 100;
      const minY = start.y + 100;
      const maxY = finish.y - 100;
      
      if (maxX <= minX || maxY <= minY) break;
      
      const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      const sizes = OBSTACLE_SIZES[type];
      const width = randomBetween(sizes.width[0], sizes.width[1]);
      const height = randomBetween(sizes.height[0], sizes.height[1]);
      
      const position: Point = {
        x: randomBetween(minX, maxX),
        y: randomBetween(minY, maxY),
      };
      
      if (getDistance(position, start) < 100 || getDistance(position, finish) < 100) {
        continue;
      }
      
      const newCenter: Point = {
        x: position.x + width / 2,
        y: position.y + height / 2,
      };
      
      let tooClose = false;
      for (const existing of obstacles) {
        const existingCenter: Point = {
          x: existing.position.x + existing.bounds.width / 2,
          y: existing.position.y + existing.bounds.height / 2,
        };
        if (getDistance(existingCenter, newCenter) < 150) {
          tooClose = true;
          break;
        }
      }
      
      if (tooClose) continue;
      
      obstacles.push({
        id: crypto.randomUUID(),
        type,
        position,
        bounds: { width, height },
        shape: type === 'tree' ? 'circle' : 'rectangle',
      });
      
      placed = true;
    }
  }
  
  return obstacles;
}

function zonesOverlap(zone1: WindZone, zone2: WindZone): boolean {
  const z1Right = zone1.position.x + zone1.bounds.width;
  const z1Bottom = zone1.position.y + zone1.bounds.height;
  const z2Right = zone2.position.x + zone2.bounds.width;
  const z2Bottom = zone2.position.y + zone2.bounds.height;
  
  return zone1.position.x < z2Right &&
         z1Right > zone2.position.x &&
         zone1.position.y < z2Bottom &&
         z1Bottom > zone2.position.y;
}

function generateWindZones(start: Point, finish: Point): WindZone[] {
  const zones: WindZone[] = [];
  const zoneCount = 1 + Math.floor(Math.random() * 2);
  const levelWidth = Math.abs(finish.x - start.x);
  const levelHeight = finish.y - start.y;
  
  for (let i = 0; i < zoneCount; i++) {
    const useVertical = Math.random() > 0.5;
    
    if (useVertical) {
      const width = randomBetween(400, 800);
      const minX = Math.min(start.x, finish.x) + 50;
      const maxX = Math.max(start.x, finish.x) - 50;
      
      if (maxX <= minX + width) continue;
      
      zones.push({
        id: crypto.randomUUID(),
        position: {
          x: randomBetween(minX, maxX - width),
          y: randomBetween(start.y + 50, finish.y - levelHeight * 0.8 - 50),
        },
        bounds: {
          width,
          height: randomBetween(levelHeight * 0.4, levelHeight * 0.8),
        },
        direction: Math.random() > 0.5 ? 'left' : 'right',
        strength: randomBetween(0.25, 0.8),
        shape: 'vertical-column',
      });
    } else {
      const height = randomBetween(150, 300);
      const minY = start.y + 50;
      const maxY = finish.y - 50;
      
      if (maxY <= minY + height) continue;
      
      const width = randomBetween(levelWidth * 0.6, levelWidth * 0.9);
      zones.push({
        id: crypto.randomUUID(),
        position: {
          x: randomBetween(
            Math.min(start.x, finish.x) + 50,
            Math.max(start.x, finish.x) - width - 50
          ),
          y: randomBetween(minY, maxY - height),
        },
        bounds: { width, height },
        direction: Math.random() > 0.5 ? 'left' : 'right',
        strength: randomBetween(0.25, 0.8),
        shape: 'horizontal-band',
      });
    }
  }
  
  const filteredZones: WindZone[] = [];
  for (const zone of zones) {
    if (!filteredZones.some(existing => zonesOverlap(zone, existing))) {
      filteredZones.push(zone);
    }
  }
  
  return filteredZones;
}

export function generateLevel(): Level {
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
  
  return {
    id: crypto.randomUUID(),
    start,
    finish,
    staticObstacles: generateStaticObstacles(start, finish),
    windZones: generateWindZones(start, finish),
  };
}
