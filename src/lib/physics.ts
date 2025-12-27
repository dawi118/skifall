import * as planck from 'planck';
import type { Line, StaticObstacle, MovingObstacle, WindZone, Point } from '../types';
import { smoothLineWithSpline } from './line-utils';
import { GRAVITY, CRASH_VELOCITY_THRESHOLD } from './constants';
import {
  HEAD_RADIUS,
  UPPER_BODY_WIDTH,
  UPPER_BODY_HEIGHT,
  LOWER_BODY_WIDTH,
  LOWER_BODY_HEIGHT,
  SKI_WIDTH,
  SKI_HEIGHT,
  type SkierRenderState,
} from './skier';

const { World, Vec2, Box, Circle, Edge, RevoluteJoint, WeldJoint, Polygon } = planck;

const SCALE = 30;
const CATEGORY_GROUND = 0x0001;
const CATEGORY_SKIS = 0x0002;
const CATEGORY_BODY = 0x0004;
const CATEGORY_OBSTACLE = 0x0008;

function toPhysics(px: number): number {
  return px / SCALE;
}

function toPixels(m: number): number {
  return m * SCALE;
}

export interface ObstaclePhysicsBody {
  obstacleId: string;
  body: planck.Body;
  fixture: planck.Fixture;
  isMoving: boolean;
  movementUpdate?: (deltaTime: number) => void;
}

export interface PhysicsEngine {
  world: planck.World;
  head: planck.Body;
  upperBody: planck.Body;
  lowerBody: planck.Body;
  skis: planck.Body;
  neckJoint: planck.Joint | null;
  hipJoint: planck.Joint | null;
  ankleJoint: planck.Joint | null;
  groundBody: planck.Body;
  lineFixtures: Map<string, planck.Fixture[]>;
  obstacleBodies: Map<string, ObstaclePhysicsBody>;
  windZones: WindZone[];
  crashed: boolean;
  spawnX: number;
  spawnY: number;
}

export function createPhysicsEngine(spawnX: number, spawnY: number): PhysicsEngine {
  const world = new World({ gravity: Vec2(0, GRAVITY * 10) });
  const groundBody = world.createBody({ type: 'static' });

  const headR = toPhysics(HEAD_RADIUS);
  const upperW = toPhysics(UPPER_BODY_WIDTH);
  const upperH = toPhysics(UPPER_BODY_HEIGHT);
  const lowerW = toPhysics(LOWER_BODY_WIDTH);
  const lowerH = toPhysics(LOWER_BODY_HEIGHT);
  const skiW = toPhysics(SKI_WIDTH);
  const skiH = toPhysics(SKI_HEIGHT);

  const pSpawnX = toPhysics(spawnX);
  const pSpawnY = toPhysics(spawnY);

  const skiCenterY = pSpawnY;
  const ankleY = skiCenterY - skiH / 2;
  const lowerCenterY = ankleY - lowerH / 2;
  const hipY = lowerCenterY - lowerH / 2;
  const upperCenterY = hipY - upperH / 2;
  const neckY = upperCenterY - upperH / 2;
  const headCenterY = neckY - headR;

  const head = world.createBody({
    type: 'dynamic',
    position: Vec2(pSpawnX, headCenterY),
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
    filterMaskBits: CATEGORY_GROUND | CATEGORY_OBSTACLE,
  });
  head.setUserData({ type: 'body' });

  const upperBody = world.createBody({
    type: 'dynamic',
    position: Vec2(pSpawnX, upperCenterY),
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
    filterMaskBits: CATEGORY_GROUND | CATEGORY_OBSTACLE,
  });
  upperBody.setUserData({ type: 'body' });

  const lowerBody = world.createBody({
    type: 'dynamic',
    position: Vec2(pSpawnX, lowerCenterY),
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
    filterMaskBits: CATEGORY_GROUND | CATEGORY_OBSTACLE,
  });
  lowerBody.setUserData({ type: 'body' });

  const skis = world.createBody({
    type: 'dynamic',
    position: Vec2(pSpawnX, skiCenterY),
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
    filterMaskBits: CATEGORY_GROUND | CATEGORY_OBSTACLE,
  });
  skis.setUserData({ type: 'skis' });

  const neckJoint = world.createJoint(
    new WeldJoint({ frequencyHz: 8.0, dampingRatio: 0.9 }, head, upperBody, Vec2(pSpawnX, neckY))
  );

  const hipJoint = world.createJoint(
    new RevoluteJoint(
      { enableLimit: true, lowerAngle: -Math.PI / 6, upperAngle: Math.PI / 6 },
      upperBody,
      lowerBody,
      Vec2(pSpawnX, hipY)
    )
  );

  const ankleJoint = world.createJoint(new WeldJoint({}, lowerBody, skis, Vec2(pSpawnX, ankleY)));

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
    obstacleBodies: new Map(),
    windZones: [],
    crashed: false,
    spawnX,
    spawnY,
  };

  world.on('begin-contact', (contact) => {
    const bodyA = contact.getFixtureA().getBody();
    const bodyB = contact.getFixtureB().getBody();
    const userDataA = bodyA.getUserData() as { type: string; obstacleId?: string } | null;
    const userDataB = bodyB.getUserData() as { type: string; obstacleId?: string } | null;

    const bodyHitGround = userDataA?.type === 'body' && bodyB === groundBody;
    const groundHitBody = userDataB?.type === 'body' && bodyA === groundBody;
    const bodyHitObstacle = userDataA?.type === 'body' && userDataB?.obstacleId;
    const obstacleHitBody = userDataB?.type === 'body' && userDataA?.obstacleId;

    if ((bodyHitGround || groundHitBody || bodyHitObstacle || obstacleHitBody) && !engine.crashed && engine.hipJoint) {
      const bodyPart = bodyHitGround || bodyHitObstacle ? bodyA : bodyB;
      
      const velocity = bodyPart.getLinearVelocity();
      const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      if (speed > CRASH_VELOCITY_THRESHOLD) {
        engine.crashed = true;
      }
    }
  });

  return engine;
}

export function addLineToWorld(engine: PhysicsEngine, line: Line): void {
  if (line.points.length < 2) return;

  const smoothed = smoothLineWithSpline(line.points, 8);
  if (smoothed.length < 2) return;

  const fixtures: planck.Fixture[] = [];

  for (let i = 0; i < smoothed.length - 1; i++) {
    const p1 = smoothed[i];
    const p2 = smoothed[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (Math.sqrt(dx * dx + dy * dy) < 1) continue;

    const fixture = engine.groundBody.createFixture({
      shape: new Edge(Vec2(toPhysics(p1.x), toPhysics(p1.y)), Vec2(toPhysics(p2.x), toPhysics(p2.y))),
      friction: 0.1,
      restitution: 0.0,
      filterCategoryBits: CATEGORY_GROUND,
      filterMaskBits: CATEGORY_SKIS | CATEGORY_BODY,
    });

    fixtures.push(fixture);
  }

  engine.lineFixtures.set(line.id, fixtures);
}

export function removeLineFromWorld(engine: PhysicsEngine, lineId: string): void {
  const fixtures = engine.lineFixtures.get(lineId);
  if (fixtures) {
    for (const fixture of fixtures) {
      engine.groundBody.destroyFixture(fixture);
    }
    engine.lineFixtures.delete(lineId);
  }
}

export function resetSkier(engine: PhysicsEngine): void {
  const headR = toPhysics(HEAD_RADIUS);
  const upperH = toPhysics(UPPER_BODY_HEIGHT);
  const lowerH = toPhysics(LOWER_BODY_HEIGHT);
  const skiH = toPhysics(SKI_HEIGHT);

  const pSpawnX = toPhysics(engine.spawnX);
  const pSpawnY = toPhysics(engine.spawnY);

  const skiCenterY = pSpawnY;
  const ankleY = skiCenterY - skiH / 2;
  const lowerCenterY = ankleY - lowerH / 2;
  const hipY = lowerCenterY - lowerH / 2;
  const upperCenterY = hipY - upperH / 2;
  const neckY = upperCenterY - upperH / 2;
  const headCenterY = neckY - headR;

  const resetBody = (body: planck.Body, x: number, y: number) => {
    body.setPosition(Vec2(x, y));
    body.setLinearVelocity(Vec2(0, 0));
    body.setAngularVelocity(0);
    body.setAngle(0);
  };

  resetBody(engine.head, pSpawnX, headCenterY);
  resetBody(engine.upperBody, pSpawnX, upperCenterY);
  resetBody(engine.lowerBody, pSpawnX, lowerCenterY);
  resetBody(engine.skis, pSpawnX, skiCenterY);

  if (engine.crashed) {
    engine.neckJoint = engine.world.createJoint(
      new WeldJoint({ frequencyHz: 8.0, dampingRatio: 0.9 }, engine.head, engine.upperBody, Vec2(pSpawnX, neckY))
    );
    engine.hipJoint = engine.world.createJoint(
      new RevoluteJoint(
        { enableLimit: true, lowerAngle: -Math.PI / 6, upperAngle: Math.PI / 6 },
        engine.upperBody,
        engine.lowerBody,
        Vec2(pSpawnX, hipY)
      )
    );
    engine.ankleJoint = engine.world.createJoint(
      new WeldJoint({}, engine.lowerBody, engine.skis, Vec2(pSpawnX, ankleY))
    );
    engine.crashed = false;
  }

  engine.head.setActive(false);
  engine.upperBody.setActive(false);
  engine.lowerBody.setActive(false);
  engine.skis.setActive(false);
}

export function startSkier(engine: PhysicsEngine): void {
  engine.head.setActive(true);
  engine.upperBody.setActive(true);
  engine.lowerBody.setActive(true);
  engine.skis.setActive(true);
}

export function stepPhysics(engine: PhysicsEngine, deltaMs: number): void {
  if (engine.crashed && engine.hipJoint) {
    if (engine.neckJoint) {
      engine.world.destroyJoint(engine.neckJoint);
      engine.neckJoint = null;
    }
    if (engine.hipJoint) {
      engine.world.destroyJoint(engine.hipJoint);
      engine.hipJoint = null;
    }
    if (engine.ankleJoint) {
      engine.world.destroyJoint(engine.ankleJoint);
      engine.ankleJoint = null;
    }

    engine.head.setAngularVelocity(engine.head.getAngularVelocity() + (Math.random() - 0.5) * 20);
    engine.upperBody.setAngularVelocity(engine.upperBody.getAngularVelocity() + (Math.random() - 0.5) * 15);
    engine.lowerBody.setAngularVelocity(engine.lowerBody.getAngularVelocity() + (Math.random() - 0.5) * 12);
    engine.skis.setAngularVelocity(engine.skis.getAngularVelocity() + (Math.random() - 0.5) * 20);
  }

  updateMovingObstacles(engine, deltaMs);
  applyWindForces(engine);

  const dt = Math.min(deltaMs / 1000, 1 / 30);
  engine.world.step(dt, 8, 3);
}

export function getSkierState(engine: PhysicsEngine): SkierRenderState {
  const headPos = engine.head.getPosition();
  const upperPos = engine.upperBody.getPosition();
  const lowerPos = engine.lowerBody.getPosition();
  const skisPos = engine.skis.getPosition();

  return {
    head: { x: toPixels(headPos.x), y: toPixels(headPos.y), angle: engine.head.getAngle() },
    upper: { x: toPixels(upperPos.x), y: toPixels(upperPos.y), angle: engine.upperBody.getAngle() },
    lower: { x: toPixels(lowerPos.x), y: toPixels(lowerPos.y), angle: engine.lowerBody.getAngle() },
    skis: { x: toPixels(skisPos.x), y: toPixels(skisPos.y), angle: engine.skis.getAngle() },
    crashed: engine.crashed,
  };
}

function isPointInWindZone(point: Point, zone: WindZone): boolean {
  const left = zone.position.x - zone.bounds.width / 2;
  const right = zone.position.x + zone.bounds.width / 2;
  const top = zone.position.y - zone.bounds.height / 2;
  const bottom = zone.position.y + zone.bounds.height / 2;
  return point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
}

export function addStaticObstacle(engine: PhysicsEngine, obstacle: StaticObstacle): void {
  const pX = toPhysics(obstacle.position.x);
  const pY = toPhysics(obstacle.position.y);
  const pW = toPhysics(obstacle.bounds.width);
  const pH = toPhysics(obstacle.bounds.height);

  const body = engine.world.createBody({
    type: 'static',
    position: Vec2(pX, pY),
  });

  let shape: planck.Shape;
  if (obstacle.shape === 'circle') {
    shape = new Circle(Math.max(pW, pH) / 2);
  } else if (obstacle.shape === 'polygon' && obstacle.vertices) {
    const vertices = obstacle.vertices.map(v => Vec2(toPhysics(v.x - obstacle.position.x), toPhysics(v.y - obstacle.position.y)));
    shape = new Polygon(vertices);
  } else {
    shape = new Box(pW / 2, pH / 2);
  }

  const fixture = body.createFixture({
    shape,
    filterCategoryBits: CATEGORY_OBSTACLE,
    filterMaskBits: CATEGORY_BODY | CATEGORY_SKIS,
  });

  body.setUserData({ obstacleId: obstacle.id });

  engine.obstacleBodies.set(obstacle.id, {
    obstacleId: obstacle.id,
    body,
    fixture,
    isMoving: false,
  });
}

export function addMovingObstacle(engine: PhysicsEngine, obstacle: MovingObstacle, startTime: number = 0): void {
  const pX = toPhysics(obstacle.basePosition.x);
  const pY = toPhysics(obstacle.basePosition.y);
  const pW = toPhysics(obstacle.bounds.width);
  const pH = toPhysics(obstacle.bounds.height);

  const body = engine.world.createBody({
    type: 'kinematic',
    position: Vec2(pX, pY),
  });

  const fixture = body.createFixture({
    shape: new Box(pW / 2, pH / 2),
    filterCategoryBits: CATEGORY_OBSTACLE,
    filterMaskBits: CATEGORY_BODY | CATEGORY_SKIS,
  });

  body.setUserData({ obstacleId: obstacle.id });

  let time = startTime / 1000;

  const movementUpdate = (deltaTime: number) => {
    time += deltaTime;
    const pattern = obstacle.movement;
    let newX = obstacle.basePosition.x;
    let newY = obstacle.basePosition.y;

    if (pattern.type === 'linear' && pattern.path && pattern.path.length >= 2) {
      const totalDist = Math.sqrt(
        Math.pow(pattern.path[1].x - pattern.path[0].x, 2) +
        Math.pow(pattern.path[1].y - pattern.path[0].y, 2)
      );
      const cycleTime = totalDist / pattern.speed;
      const t = (time % (cycleTime * 2)) / cycleTime;
      const progress = t <= 1 ? t : 2 - t;
      newX = pattern.path[0].x + (pattern.path[1].x - pattern.path[0].x) * progress;
      newY = pattern.path[0].y + (pattern.path[1].y - pattern.path[0].y) * progress;
    } else if (pattern.type === 'oscillate' && pattern.amplitude && pattern.frequency) {
      const offset = pattern.amplitude * Math.sin(time * pattern.frequency * Math.PI * 2);
      if (pattern.direction === 'vertical') {
        newY = obstacle.basePosition.y + offset;
      } else if (pattern.direction === 'horizontal') {
        newX = obstacle.basePosition.x + offset;
      }
    } else if (pattern.type === 'circular' && pattern.radius) {
      const angle = (time * pattern.speed) / pattern.radius;
      newX = obstacle.basePosition.x + Math.cos(angle) * pattern.radius;
      newY = obstacle.basePosition.y + Math.sin(angle) * pattern.radius;
    }

    body.setPosition(Vec2(toPhysics(newX), toPhysics(newY)));
  };

  engine.obstacleBodies.set(obstacle.id, {
    obstacleId: obstacle.id,
    body,
    fixture,
    isMoving: true,
    movementUpdate,
  });
}

export function removeObstacle(engine: PhysicsEngine, obstacleId: string): void {
  const obstacleBody = engine.obstacleBodies.get(obstacleId);
  if (obstacleBody) {
    engine.world.destroyBody(obstacleBody.body);
    engine.obstacleBodies.delete(obstacleId);
  }
}

export function clearObstacles(engine: PhysicsEngine): void {
  for (const [, obstacleBody] of engine.obstacleBodies) {
    engine.world.destroyBody(obstacleBody.body);
  }
  engine.obstacleBodies.clear();
}

export function setWindZones(engine: PhysicsEngine, windZones: WindZone[]): void {
  engine.windZones = windZones;
}

export function applyWindForces(engine: PhysicsEngine): void {
  const skisPos = engine.skis.getPosition();
  const skierPoint = { x: toPixels(skisPos.x), y: toPixels(skisPos.y) };

  for (const zone of engine.windZones) {
    if (isPointInWindZone(skierPoint, zone)) {
      const windMultiplier = Math.min(zone.strength, 1.0) * 0.6; // Cap at 1.0 and scale down
      const forceX = zone.direction === 'left' ? -windMultiplier * GRAVITY : windMultiplier * GRAVITY;
      const force = Vec2(forceX, 0);
      engine.skis.applyForce(force, skisPos);
      engine.upperBody.applyForce(force, engine.upperBody.getPosition());
      engine.lowerBody.applyForce(force, engine.lowerBody.getPosition());
      engine.head.applyForce(force, engine.head.getPosition());
    }
  }
}

export function updateMovingObstacles(engine: PhysicsEngine, deltaMs: number): void {
  const deltaTime = deltaMs / 1000;
  for (const [, obstacleBody] of engine.obstacleBodies) {
    if (obstacleBody.isMoving && obstacleBody.movementUpdate) {
      obstacleBody.movementUpdate(deltaTime);
    }
  }
}
