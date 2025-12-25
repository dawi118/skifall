import * as planck from 'planck';
import type { Line } from '../types';
import { smoothLineWithSpline } from './line-utils';
import {
  GRAVITY,
  SKIER_WIDTH,
  SKIER_HEIGHT,
  SPAWN_POSITION,
} from './constants';

const { World, Vec2, Box, Circle, Edge, RevoluteJoint, WeldJoint } = planck;

// Planck.js uses meters, we use pixels. Scale factor:
const SCALE = 30; // 30 pixels = 1 meter

// Collision categories
const CATEGORY_GROUND = 0x0001;
const CATEGORY_SKIS = 0x0002;
const CATEGORY_BODY = 0x0004;

// Convert pixel coordinates to physics coordinates
function toPhysics(px: number): number {
  return px / SCALE;
}

// Convert physics coordinates to pixel coordinates  
function toPixels(m: number): number {
  return m * SCALE;
}

export interface PhysicsEngine {
  world: planck.World;
  head: planck.Body;           // Head
  upperBody: planck.Body;      // Torso
  lowerBody: planck.Body;      // Legs
  skis: planck.Body;           // Skis
  neckJoint: planck.Joint | null;   // Connects head to upper body
  hipJoint: planck.Joint | null;    // Connects upper to lower body
  ankleJoint: planck.Joint | null;  // Connects lower body to skis
  groundBody: planck.Body;
  lineFixtures: Map<string, planck.Fixture[]>;
  crashed: boolean;
}

// Dimensions in pixels
const HEAD_RADIUS = 7;
const UPPER_BODY_WIDTH = SKIER_WIDTH;
const UPPER_BODY_HEIGHT = SKIER_HEIGHT * 0.45;
const LOWER_BODY_WIDTH = SKIER_WIDTH * 0.8;
const LOWER_BODY_HEIGHT = SKIER_HEIGHT * 0.35;
const SKI_WIDTH = SKIER_WIDTH * 1.5;
const SKI_HEIGHT = 4;

/**
 * Create the Planck.js physics world
 */
export function createPhysicsEngine(): PhysicsEngine {
  const world = new World({
    gravity: Vec2(0, GRAVITY * 10),
  });

  const groundBody = world.createBody({
    type: 'static',
  });

  // Convert to physics units
  const headR = toPhysics(HEAD_RADIUS);
  const upperW = toPhysics(UPPER_BODY_WIDTH);
  const upperH = toPhysics(UPPER_BODY_HEIGHT);
  const lowerW = toPhysics(LOWER_BODY_WIDTH);
  const lowerH = toPhysics(LOWER_BODY_HEIGHT);
  const skiW = toPhysics(SKI_WIDTH);
  const skiH = toPhysics(SKI_HEIGHT);

  const spawnX = toPhysics(SPAWN_POSITION.x);
  const spawnY = toPhysics(SPAWN_POSITION.y);

  // Calculate positions from bottom up
  const skiCenterY = spawnY;
  const ankleY = skiCenterY - skiH / 2;
  const lowerCenterY = ankleY - lowerH / 2;
  const hipY = lowerCenterY - lowerH / 2;
  const upperCenterY = hipY - upperH / 2;
  const neckY = upperCenterY - upperH / 2;
  const headCenterY = neckY - headR;

  // Create head
  const head = world.createBody({
    type: 'dynamic',
    position: Vec2(spawnX, headCenterY),
    bullet: true,
    angularDamping: 2.0,
    linearDamping: 0.1,
  });

  head.createFixture({
    shape: new Circle(headR),
    density: 0.8,
    friction: 0.3,
    restitution: 0.2,
    filterCategoryBits: CATEGORY_BODY,
    filterMaskBits: CATEGORY_GROUND,
  });
  head.setUserData({ type: 'body' });

  // Create upper body (torso)
  const upperBody = world.createBody({
    type: 'dynamic',
    position: Vec2(spawnX, upperCenterY),
    bullet: true,
    angularDamping: 3.0,
    linearDamping: 0.1,
  });

  upperBody.createFixture({
    shape: new Box(upperW / 2, upperH / 2),
    density: 1.0,
    friction: 0.3,
    restitution: 0.1,
    filterCategoryBits: CATEGORY_BODY,
    filterMaskBits: CATEGORY_GROUND,
  });
  upperBody.setUserData({ type: 'body' });

  // Create lower body (legs)
  const lowerBody = world.createBody({
    type: 'dynamic',
    position: Vec2(spawnX, lowerCenterY),
    bullet: true,
    angularDamping: 2.0,
    linearDamping: 0.1,
  });

  lowerBody.createFixture({
    shape: new Box(lowerW / 2, lowerH / 2),
    density: 0.8,
    friction: 0.3,
    restitution: 0.1,
    filterCategoryBits: CATEGORY_BODY,
    filterMaskBits: CATEGORY_GROUND,
  });
  lowerBody.setUserData({ type: 'body' });

  // Create skis
  const skis = world.createBody({
    type: 'dynamic',
    position: Vec2(spawnX, skiCenterY),
    bullet: true,
    angularDamping: 1.0,
    linearDamping: 0.05,
  });

  skis.createFixture({
    shape: new Box(skiW / 2, skiH / 2),
    density: 0.3,
    friction: 0.02,
    restitution: 0.0,
    filterCategoryBits: CATEGORY_SKIS,
    filterMaskBits: CATEGORY_GROUND,
  });
  skis.setUserData({ type: 'skis' });

  // Neck joint - connects head to upper body (rigid but with slight give)
  const neckJoint = world.createJoint(new WeldJoint(
    {
      frequencyHz: 8.0,  // Stiff but not completely rigid
      dampingRatio: 0.9,
    },
    head,
    upperBody,
    Vec2(spawnX, neckY)
  ));

  // Hip joint - connects upper body to lower body with bounce
  const hipJoint = world.createJoint(new RevoluteJoint(
    {
      enableLimit: true,
      lowerAngle: -Math.PI / 6,
      upperAngle: Math.PI / 6,
    },
    upperBody,
    lowerBody,
    Vec2(spawnX, hipY)
  ));

  // Ankle joint - connects lower body to skis (rigid)
  const ankleJoint = world.createJoint(new WeldJoint(
    {},
    lowerBody,
    skis,
    Vec2(spawnX, ankleY)
  ));

  // Start inactive
  head.setActive(false);
  upperBody.setActive(false);
  lowerBody.setActive(false);
  skis.setActive(false);

  const engine: PhysicsEngine = {
    world,
    head,
    upperBody,
    lowerBody,
    skis,
    neckJoint,
    hipJoint,
    ankleJoint,
    groundBody,
    lineFixtures: new Map(),
    crashed: false,
  };

  // Collision detection for crash
  world.on('begin-contact', (contact) => {
    const fixtureA = contact.getFixtureA();
    const fixtureB = contact.getFixtureB();
    const bodyA = fixtureA.getBody();
    const bodyB = fixtureB.getBody();

    const userDataA = bodyA.getUserData() as { type: string } | null;
    const userDataB = bodyB.getUserData() as { type: string } | null;

    // Crash if any body part (head, upper, lower) hits ground
    const isBodyHit = 
      (userDataA?.type === 'body' && bodyB === groundBody) ||
      (userDataB?.type === 'body' && bodyA === groundBody);

    if (isBodyHit && !engine.crashed && engine.hipJoint) {
      engine.crashed = true;
    }
  });

  return engine;
}

/**
 * Create edge fixtures for a line
 */
export function addLineToWorld(physics: PhysicsEngine, line: Line): void {
  const { points } = line;
  if (points.length < 2) return;

  const smoothedPoints = smoothLineWithSpline(points, 8);
  if (smoothedPoints.length < 2) return;

  const fixtures: planck.Fixture[] = [];

  for (let i = 0; i < smoothedPoints.length - 1; i++) {
    const p1 = smoothedPoints[i];
    const p2 = smoothedPoints[i + 1];

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (Math.sqrt(dx * dx + dy * dy) < 1) continue;

    const fixture = physics.groundBody.createFixture({
      shape: new Edge(
        Vec2(toPhysics(p1.x), toPhysics(p1.y)),
        Vec2(toPhysics(p2.x), toPhysics(p2.y))
      ),
      friction: 0.1,
      restitution: 0.0,
      filterCategoryBits: CATEGORY_GROUND,
      filterMaskBits: CATEGORY_SKIS | CATEGORY_BODY,
    });

    fixtures.push(fixture);
  }

  physics.lineFixtures.set(line.id, fixtures);
}

/**
 * Remove a line from the physics world
 */
export function removeLineFromWorld(physics: PhysicsEngine, lineId: string): void {
  const fixtures = physics.lineFixtures.get(lineId);
  if (fixtures) {
    for (const fixture of fixtures) {
      physics.groundBody.destroyFixture(fixture);
    }
    physics.lineFixtures.delete(lineId);
  }
}

/**
 * Reset skier to spawn position
 */
export function resetSkier(physics: PhysicsEngine): void {
  const headR = toPhysics(HEAD_RADIUS);
  const upperH = toPhysics(UPPER_BODY_HEIGHT);
  const lowerH = toPhysics(LOWER_BODY_HEIGHT);
  const skiH = toPhysics(SKI_HEIGHT);

  const spawnX = toPhysics(SPAWN_POSITION.x);
  const spawnY = toPhysics(SPAWN_POSITION.y);

  // Calculate positions (same as creation)
  const skiCenterY = spawnY;
  const ankleY = skiCenterY - skiH / 2;
  const lowerCenterY = ankleY - lowerH / 2;
  const hipY = lowerCenterY - lowerH / 2;
  const upperCenterY = hipY - upperH / 2;
  const neckY = upperCenterY - upperH / 2;
  const headCenterY = neckY - headR;

  // Reset all positions first
  physics.head.setPosition(Vec2(spawnX, headCenterY));
  physics.head.setLinearVelocity(Vec2(0, 0));
  physics.head.setAngularVelocity(0);
  physics.head.setAngle(0);

  physics.upperBody.setPosition(Vec2(spawnX, upperCenterY));
  physics.upperBody.setLinearVelocity(Vec2(0, 0));
  physics.upperBody.setAngularVelocity(0);
  physics.upperBody.setAngle(0);

  physics.lowerBody.setPosition(Vec2(spawnX, lowerCenterY));
  physics.lowerBody.setLinearVelocity(Vec2(0, 0));
  physics.lowerBody.setAngularVelocity(0);
  physics.lowerBody.setAngle(0);

  physics.skis.setPosition(Vec2(spawnX, skiCenterY));
  physics.skis.setLinearVelocity(Vec2(0, 0));
  physics.skis.setAngularVelocity(0);
  physics.skis.setAngle(0);

  // Recreate joints if crashed
  if (physics.crashed) {
    // Recreate neck joint
    physics.neckJoint = physics.world.createJoint(new WeldJoint(
      {
        frequencyHz: 8.0,
        dampingRatio: 0.9,
      },
      physics.head,
      physics.upperBody,
      Vec2(spawnX, neckY)
    ));

    // Recreate hip joint
    physics.hipJoint = physics.world.createJoint(new RevoluteJoint(
      {
        enableLimit: true,
        lowerAngle: -Math.PI / 6,
        upperAngle: Math.PI / 6,
      },
      physics.upperBody,
      physics.lowerBody,
      Vec2(spawnX, hipY)
    ));

    // Recreate ankle joint
    physics.ankleJoint = physics.world.createJoint(new WeldJoint(
      {},
      physics.lowerBody,
      physics.skis,
      Vec2(spawnX, ankleY)
    ));

    physics.crashed = false;
  }

  // Deactivate
  physics.head.setActive(false);
  physics.upperBody.setActive(false);
  physics.lowerBody.setActive(false);
  physics.skis.setActive(false);
}

/**
 * Start the skier
 */
export function startSkier(physics: PhysicsEngine): void {
  physics.head.setActive(true);
  physics.upperBody.setActive(true);
  physics.lowerBody.setActive(true);
  physics.skis.setActive(true);
}

/**
 * Step the physics simulation
 */
export function stepPhysics(physics: PhysicsEngine, deltaMs: number): void {
  // Process crash
  if (physics.crashed && physics.hipJoint) {
    // Destroy all joints
    if (physics.neckJoint) {
      physics.world.destroyJoint(physics.neckJoint);
      physics.neckJoint = null;
    }
    if (physics.hipJoint) {
      physics.world.destroyJoint(physics.hipJoint);
      physics.hipJoint = null;
    }
    if (physics.ankleJoint) {
      physics.world.destroyJoint(physics.ankleJoint);
      physics.ankleJoint = null;
    }
    
    // Add dramatic spin to all parts
    physics.head.setAngularVelocity(physics.head.getAngularVelocity() + (Math.random() - 0.5) * 20);
    physics.upperBody.setAngularVelocity(physics.upperBody.getAngularVelocity() + (Math.random() - 0.5) * 15);
    physics.lowerBody.setAngularVelocity(physics.lowerBody.getAngularVelocity() + (Math.random() - 0.5) * 12);
    physics.skis.setAngularVelocity(physics.skis.getAngularVelocity() + (Math.random() - 0.5) * 20);
  }

  const dt = Math.min(deltaMs / 1000, 1 / 30);
  physics.world.step(dt, 8, 3);
}

/**
 * Get upper body position (for camera follow)
 */
export function getSkierPosition(physics: PhysicsEngine): { x: number; y: number } {
  const pos = physics.upperBody.getPosition();
  return { x: toPixels(pos.x), y: toPixels(pos.y) };
}

export function getSkierAngle(physics: PhysicsEngine): number {
  return physics.upperBody.getAngle();
}

/**
 * Get all body parts for rendering
 */
export interface SkierParts {
  head: { x: number; y: number; angle: number };
  upper: { x: number; y: number; angle: number };
  lower: { x: number; y: number; angle: number };
  skis: { x: number; y: number; angle: number };
}

export function getSkierParts(physics: PhysicsEngine): SkierParts {
  const headPos = physics.head.getPosition();
  const upperPos = physics.upperBody.getPosition();
  const lowerPos = physics.lowerBody.getPosition();
  const skisPos = physics.skis.getPosition();
  
  return {
    head: { x: toPixels(headPos.x), y: toPixels(headPos.y), angle: physics.head.getAngle() },
    upper: { x: toPixels(upperPos.x), y: toPixels(upperPos.y), angle: physics.upperBody.getAngle() },
    lower: { x: toPixels(lowerPos.x), y: toPixels(lowerPos.y), angle: physics.lowerBody.getAngle() },
    skis: { x: toPixels(skisPos.x), y: toPixels(skisPos.y), angle: physics.skis.getAngle() },
  };
}

export function hasCrashed(physics: PhysicsEngine): boolean {
  return physics.crashed;
}

// Export dimensions for rendering
export { HEAD_RADIUS, UPPER_BODY_HEIGHT, LOWER_BODY_HEIGHT, LOWER_BODY_WIDTH, SKI_WIDTH, SKI_HEIGHT };
