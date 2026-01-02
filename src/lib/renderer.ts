import type { Point, Line, Camera } from '../types';
import { COLORS, LINE_WIDTH } from './constants';
import type { StaticObstacle, WindZone } from './level-generator';
import type { ObstacleSprites } from './obstacle-sprites';

const GRID_SIZE = 50;

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
) {
  const viewWidth = canvasWidth / camera.zoom;
  const viewHeight = canvasHeight / camera.zoom;
  const padding = GRID_SIZE * 2;

  const left = camera.x - viewWidth / 2 - padding;
  const right = camera.x + viewWidth / 2 + padding;
  const top = camera.y - viewHeight / 2 - padding;
  const bottom = camera.y + viewHeight / 2 + padding;

  const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
  const endX = Math.ceil(right / GRID_SIZE) * GRID_SIZE;
  const startY = Math.floor(top / GRID_SIZE) * GRID_SIZE;
  const endY = Math.ceil(bottom / GRID_SIZE) * GRID_SIZE;

  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;

  for (let x = startX; x <= endX; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }

  for (let y = startY; y <= endY; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}

export function drawMarker(
  ctx: CanvasRenderingContext2D,
  position: Point,
  label: string,
  color: string,
  scale = 1
) {
  if (scale <= 0) return;

  ctx.save();
  ctx.translate(position.x, position.y - 20);
  ctx.scale(scale, scale);

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.3 * scale;
  ctx.beginPath();
  ctx.arc(0, 0, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = scale;

  ctx.fillStyle = color;
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -40);

  ctx.restore();
}

export function drawLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  highlight = false,
  opacity = 1,
  color?: string
) {
  if (points.length < 2 || opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color ?? (highlight ? COLORS.lineHighlight : COLORS.line);
  ctx.lineWidth = highlight ? LINE_WIDTH + 2 : LINE_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawLines(
  ctx: CanvasRenderingContext2D,
  lines: Line[],
  hoveredLineId: string | null,
  opacity = 1
) {
  for (const line of lines) {
    drawLine(ctx, line.points, line.id === hoveredLineId, opacity);
  }
}

export function applyCameraTransform(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
) {
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
}

export function calculateFitBounds(
  start: Point,
  finish: Point,
  viewportWidth: number,
  viewportHeight: number,
  padding = 150
): { centerX: number; centerY: number; zoom: number } {
  const minX = Math.min(start.x, finish.x) - padding;
  const maxX = Math.max(start.x, finish.x) + padding;
  const minY = Math.min(start.y, finish.y) - padding;
  const maxY = Math.max(start.y, finish.y) + padding;

  const width = maxX - minX;
  const height = maxY - minY;

  const zoomX = viewportWidth / width;
  const zoomY = viewportHeight / height;
  const zoom = Math.min(zoomX, zoomY, 1); // Cap at 1x

  return {
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    zoom,
  };
}

export function calculateObstacleRenderedPosition(
  obstacle: StaticObstacle,
  image: HTMLImageElement | null
): { width: number; height: number; x: number; y: number } {
  const { position, bounds } = obstacle;
  
  if (!image) {
    return {
      width: bounds.width,
      height: bounds.height,
      x: position.x,
      y: position.y,
    };
  }
  
  const imageAspect = image.width / image.height;
  const boundsAspect = bounds.width / bounds.height;
  
  let drawWidth: number;
  let drawHeight: number;
  let drawX: number;
  let drawY: number;
  
  if (imageAspect > boundsAspect) {
    drawWidth = bounds.width;
    drawHeight = bounds.width / imageAspect;
    drawX = position.x;
    drawY = position.y + (bounds.height - drawHeight) / 2;
  } else {
    drawHeight = bounds.height;
    drawWidth = bounds.height * imageAspect;
    drawX = position.x + (bounds.width - drawWidth) / 2;
    drawY = position.y;
  }
  
  return { width: drawWidth, height: drawHeight, x: drawX, y: drawY };
}
function getObstacleImage(type: StaticObstacle['type'], sprites: ObstacleSprites | null): HTMLImageElement | null {
  switch (type) {
    case 'mountain-peak': return sprites?.mountainPeak ?? null;
    case 'rock-formation': return sprites?.rockFormation ?? null;
    case 'tree': return sprites?.tree ?? null;
    case 'structure': return sprites?.house ?? null;
  }
}

export function drawStaticObstacle(
  ctx: CanvasRenderingContext2D,
  obstacle: StaticObstacle,
  sprites: ObstacleSprites | null
): void {
  ctx.save();
  
  const obstacleImage = getObstacleImage(obstacle.type, sprites);
  const rendered = calculateObstacleRenderedPosition(obstacle, obstacleImage);
  
  if (obstacleImage) {
    ctx.drawImage(obstacleImage, rendered.x, rendered.y, rendered.width, rendered.height);
  } else {
    ctx.fillStyle = '#6B7280';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(rendered.x, rendered.y, rendered.width, rendered.height);
    ctx.globalAlpha = 1;
  }
  
  ctx.restore();
}

export function drawStaticObstacles(
  ctx: CanvasRenderingContext2D,
  obstacles: StaticObstacle[],
  sprites: ObstacleSprites | null = null
): void {
  for (const obstacle of obstacles) {
    drawStaticObstacle(ctx, obstacle, sprites);
  }
}

function drawWisp(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, alpha: number, color: string): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalAlpha = alpha * 0.4;
  ctx.beginPath();
  ctx.arc(x, y, size * 1.8, 0, Math.PI * 2);
  ctx.fill();
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function drawWindZone(
  ctx: CanvasRenderingContext2D,
  zone: WindZone,
  animationTime: number = 0
): void {
  ctx.save();
  
  const { position, bounds, direction, strength } = zone;
  const wispCount = Math.ceil((bounds.width * bounds.height) / 400);
  const wispSpeed = 0.0003 + strength * 0.0002;
  const baseWispSize = (1.5 + strength * 0.5) * 0.25;
  
  for (let i = 0; i < wispCount; i++) {
    const seed = zone.id.charCodeAt(0) + i * 17;
    const phase = (animationTime * wispSpeed + pseudoRandom(seed) * 0.5) % 1;
    const wispSize = baseWispSize + pseudoRandom(seed * 3) * 0.1;
    const alpha = 0.7 + pseudoRandom(seed * 5) * 0.2;
    
    const hue = 200 + pseudoRandom(seed * 7) * 20;
    const saturation = 60 + pseudoRandom(seed * 11) * 20;
    const lightness = 50 + pseudoRandom(seed * 13) * 20;
    ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    
    const baseX = position.x + pseudoRandom(seed * 11) * bounds.width;
    const baseY = position.y + pseudoRandom(seed * 13) * bounds.height;
    
    const offsetX = direction === 'left' 
      ? phase * bounds.width * 1.5
      : -phase * bounds.width * 1.5;
    
    let x = baseX + offsetX;
    if (direction === 'left') {
      x = ((x - position.x) % (bounds.width * 1.5)) + position.x - bounds.width * 0.25;
    } else {
      x = ((x - position.x) % (bounds.width * 1.5)) + position.x - bounds.width * 0.25;
      if (x < position.x) x += bounds.width * 1.5;
    }
    
    if (x >= position.x && x <= position.x + bounds.width &&
        baseY >= position.y && baseY <= position.y + bounds.height) {
      drawWisp(ctx, x, baseY, wispSize, alpha, ctx.fillStyle as string);
    }
  }
  
  ctx.restore();
}

export function drawWindZones(
  ctx: CanvasRenderingContext2D,
  zones: WindZone[],
  animationTime: number = 0
): void {
  for (const zone of zones) {
    drawWindZone(ctx, zone, animationTime);
  }
}
