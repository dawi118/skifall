import Matter from 'matter-js';
import type { Point, Line } from '../types';
import { smoothLineWithSpline } from './line-utils';
import {
  GRAVITY,
  LINE_FRICTION,
  SKIER_WIDTH,
  SKIER_HEIGHT,
  LINE_WIDTH,
  SPAWN_POSITION,
} from './constants';

const { Engine, World, Bodies, Body } = Matter;

export interface PhysicsEngine {
  engine: Matter.Engine;
  skier: Matter.Body;
  world: Matter.World;
  linesBodies: Map<string, Matter.Body[]>;  // Array of circle bodies per line
}

/**
 * Create the Matter.js physics engine and world
 */
export function createPhysicsEngine(): PhysicsEngine {
  const engine = Engine.create();
  const world = engine.world;

  // Set gravity
  world.gravity.y = GRAVITY;

  // Create skier body
  const skier = Bodies.rectangle(
    SPAWN_POSITION.x,
    SPAWN_POSITION.y,
    SKIER_WIDTH,
    SKIER_HEIGHT,
    {
      label: 'skier',
      density: 0.2,        // Heavy! (default is 0.001) - more momentum
      friction: 0.00001,    // Extremely low - like ice
      frictionAir: 0.0001,  // Very low air resistance
      frictionStatic: 0,    // No static friction
      restitution: 0,       // No bounce at all
      // Prevent rotation for now (makes physics simpler)
      inertia: Infinity,
      inverseInertia: 0,
    }
  );

  // Add it to the world but make it static until Play
  Body.setStatic(skier, true);
  World.add(world, skier);

  return {
    engine,
    skier,
    world,
    linesBodies: new Map(),
  };
}

/**
 * Convert a freehand line (array of points) into physics bodies
 * Uses Catmull-Rom spline smoothing + thin rectangle segments
 * Returns an array of bodies to add to the world
 */
export function createLineBody(line: Line): Matter.Body[] | null {
  const { points } = line;
  if (points.length < 2) return null;

  // Smooth the line using Catmull-Rom spline
  // segmentLength of 8 gives smooth curves without too many segments
  const smoothedPoints = smoothLineWithSpline(points, 8);
  
  if (smoothedPoints.length < 2) return null;

  const bodies: Matter.Body[] = [];
  const thickness = LINE_WIDTH; // Visual thickness matches physics

  // Create thin rectangles between each pair of smoothed points
  for (let i = 0; i < smoothedPoints.length - 1; i++) {
    const p1 = smoothedPoints[i];
    const p2 = smoothedPoints[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    if (length < 0.5) continue;

    const angle = Math.atan2(dy, dx);
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;

    // Create rectangle segment with extra length for overlap
    const segment = Bodies.rectangle(midX, midY, length + thickness, thickness, {
      isStatic: true,
      angle: angle,
      friction: LINE_FRICTION,
      frictionStatic: 0,
      restitution: 0,
      chamfer: { radius: thickness / 2 }, // Round ends for smooth transitions
      label: `line-${line.id}`,
    });

    bodies.push(segment);
  }

  return bodies.length > 0 ? bodies : null;
}

/**
 * Add a line to the physics world
 */
export function addLineToWorld(
  physics: PhysicsEngine,
  line: Line
): void {
  const bodies = createLineBody(line);
  if (bodies && bodies.length > 0) {
    // Add all circle bodies to the world
    World.add(physics.world, bodies);
    physics.linesBodies.set(line.id, bodies);
  }
}

/**
 * Remove a line from the physics world
 */
export function removeLineFromWorld(
  physics: PhysicsEngine,
  lineId: string
): void {
  const bodies = physics.linesBodies.get(lineId);
  if (bodies) {
    // Remove all circle bodies for this line
    World.remove(physics.world, bodies);
    physics.linesBodies.delete(lineId);
  }
}

/**
 * Reset the skier to spawn position
 */
export function resetSkier(physics: PhysicsEngine): void {
  Body.setPosition(physics.skier, SPAWN_POSITION);
  Body.setVelocity(physics.skier, { x: 0, y: 0 });
  Body.setAngularVelocity(physics.skier, 0);
  Body.setAngle(physics.skier, 0);
  Body.setStatic(physics.skier, true);
}

/**
 * Start the skier moving (physics simulation)
 */
export function startSkier(physics: PhysicsEngine): void {
  Body.setStatic(physics.skier, false);
}

/**
 * Step the physics simulation forward
 */
export function stepPhysics(physics: PhysicsEngine, delta: number): void {
  Engine.update(physics.engine, delta);
}

/**
 * Get the skier's current position
 */
export function getSkierPosition(physics: PhysicsEngine): Point {
  return {
    x: physics.skier.position.x,
    y: physics.skier.position.y,
  };
}

/**
 * Get the skier's current angle (rotation)
 */
export function getSkierAngle(physics: PhysicsEngine): number {
  return physics.skier.angle;
}

