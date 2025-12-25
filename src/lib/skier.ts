import { SKIER_WIDTH, SKIER_HEIGHT, COLORS } from './constants';

export const HEAD_RADIUS = 7;
export const UPPER_BODY_WIDTH = SKIER_WIDTH;
export const UPPER_BODY_HEIGHT = SKIER_HEIGHT * 0.45;
export const LOWER_BODY_WIDTH = SKIER_WIDTH * 0.8;
export const LOWER_BODY_HEIGHT = SKIER_HEIGHT * 0.35;
export const SKI_WIDTH = SKIER_WIDTH * 1.5;
export const SKI_HEIGHT = 4;

interface SkierPartState {
  x: number;
  y: number;
  angle: number;
}

export interface SkierRenderState {
  head: SkierPartState;
  upper: SkierPartState;
  lower: SkierPartState;
  skis: SkierPartState;
  crashed: boolean;
}

export function calculateInitialPositions(spawnX: number, spawnY: number): SkierRenderState {
  const skiCenterY = spawnY;
  const ankleY = skiCenterY - SKI_HEIGHT / 2;
  const lowerCenterY = ankleY - LOWER_BODY_HEIGHT / 2;
  const hipY = lowerCenterY - LOWER_BODY_HEIGHT / 2;
  const upperCenterY = hipY - UPPER_BODY_HEIGHT / 2;
  const neckY = upperCenterY - UPPER_BODY_HEIGHT / 2;
  const headCenterY = neckY - HEAD_RADIUS;

  return {
    head: { x: spawnX, y: headCenterY, angle: 0 },
    upper: { x: spawnX, y: upperCenterY, angle: 0 },
    lower: { x: spawnX, y: lowerCenterY, angle: 0 },
    skis: { x: spawnX, y: skiCenterY, angle: 0 },
    crashed: false,
  };
}

function drawPart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  draw: () => void
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  draw();
  ctx.restore();
}

export function drawSkier(ctx: CanvasRenderingContext2D, state: SkierRenderState, scale = 1) {
  const { head, upper, lower, skis } = state;

  if (scale !== 1) {
    ctx.save();
    ctx.translate(upper.x, upper.y);
    ctx.scale(scale, scale);
    ctx.translate(-upper.x, -upper.y);
  }

  drawPart(ctx, skis.x, skis.y, skis.angle, () => {
    ctx.fillStyle = COLORS.skis;
    ctx.fillRect(-SKI_WIDTH / 2, -SKI_HEIGHT / 2, SKI_WIDTH, SKI_HEIGHT);
  });

  drawPart(ctx, lower.x, lower.y, lower.angle, () => {
    ctx.fillStyle = COLORS.legs;
    ctx.fillRect(-LOWER_BODY_WIDTH / 2, -LOWER_BODY_HEIGHT / 2, LOWER_BODY_WIDTH, LOWER_BODY_HEIGHT);
  });

  drawPart(ctx, upper.x, upper.y, upper.angle, () => {
    ctx.fillStyle = COLORS.skier;
    ctx.fillRect(-UPPER_BODY_WIDTH / 2, -UPPER_BODY_HEIGHT / 2, UPPER_BODY_WIDTH, UPPER_BODY_HEIGHT);
  });

  drawPart(ctx, head.x, head.y, head.angle, () => {
    ctx.fillStyle = COLORS.head;
    ctx.beginPath();
    ctx.arc(0, 0, HEAD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  });

  if (scale !== 1) {
    ctx.restore();
  }
}
