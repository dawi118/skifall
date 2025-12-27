import type { Point, Line, Camera, StaticObstacle, MovingObstacle, WindZone, NarrowPassage } from '../types';
import { COLORS, LINE_WIDTH } from './constants';

// --- Image loading helpers ---
const obstacleImageCache: Record<string, HTMLImageElement|null|undefined> = {};
function getObstacleImage(obstacleType: string): HTMLImageElement|null {
  if (obstacleType in obstacleImageCache) return obstacleImageCache[obstacleType] || null;
  const img = new window.Image();
  img.src = `/assets/obstacles/${obstacleType}.png`;
  img.onload = () => { obstacleImageCache[obstacleType] = img; };
  img.onerror = () => { obstacleImageCache[obstacleType] = null; };
  obstacleImageCache[obstacleType] = undefined;
  return null;
}


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

function drawFloatingIslandBase(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  // Floating island width is slightly larger than obstacle, height is a third
  const iw = w * 1.32;
  const ih = Math.max(h * 0.32, 14);
  // Draw snowy top
  ctx.fillStyle = '#FAFAFA';
  ctx.beginPath();
  ctx.ellipse(0, h/2 - ih/2, iw/2, ih/2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cliffs: pixel-art snowy edge
  ctx.strokeStyle = '#D6E8FF';
  ctx.lineWidth = 2;
  for (let i = -iw / 2; i < iw / 2; i += 4) {
    ctx.beginPath();
    ctx.moveTo(i, h/2 - ih/6 + Math.sin(i / 6) * 2);
    ctx.lineTo(i, h/2 + ih/2 - 1 + (Math.abs(Math.sin(i/8))*2));
    ctx.stroke();
  }
  // Island shadow
  ctx.globalAlpha = 0.11;
  ctx.fillStyle = '#2d598d';
  ctx.ellipse(0, h/2 + ih/2 - 3, iw * 0.9/2, ih*0.32/2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function drawStaticObstacle(ctx: CanvasRenderingContext2D, obstacle: StaticObstacle): void {
  ctx.save();
  ctx.translate(obstacle.position.x, obstacle.position.y);

  const w = obstacle.bounds.width;
  const h = obstacle.bounds.height;

  // Draw floating island base first
  drawFloatingIslandBase(ctx, w, h);

  // Render image if available, otherwise fallback
  const img = getObstacleImage(obstacle.type);
  if (img && img.complete && img.naturalWidth > 1) {
    // Draw image centered and scaled to fit
    const maxW = w * 0.9, maxH = h * 0.7;
    const scale = Math.min(maxW/img.naturalWidth, maxH/img.naturalHeight, 1);
    ctx.save();
    ctx.translate(0, -h*0.1);
    ctx.drawImage(img, -img.naturalWidth/2*scale, -img.naturalHeight/2*scale, img.naturalWidth*scale, img.naturalHeight*scale);
    ctx.restore();
    ctx.restore();
    return;
  }

  if (obstacle.type === 'tree') {
    // Draw a pine tree
    const trunkHeight = h * 0.3;
    const trunkWidth = w * 0.2;
    
    // Trunk
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(-trunkWidth / 2, h / 2 - trunkHeight, trunkWidth, trunkHeight);
    
    // Foliage (triangular layers)
    ctx.fillStyle = '#2D5016';
    const layers = 3;
    for (let i = 0; i < layers; i++) {
      const layerY = h / 2 - trunkHeight - (h * 0.7 / layers) * i;
      const layerWidth = w * (0.4 + 0.3 * (1 - i / layers));
      const layerHeight = h * 0.25;
      ctx.beginPath();
      ctx.moveTo(0, layerY - layerHeight);
      ctx.lineTo(-layerWidth / 2, layerY);
      ctx.lineTo(layerWidth / 2, layerY);
      ctx.closePath();
      ctx.fill();
    }
  } else if (obstacle.type === 'rock-formation') {
    // Draw irregular rock formation (deterministic based on obstacle ID)
    ctx.fillStyle = '#6B5B4F';
    ctx.strokeStyle = '#4A4035';
    ctx.lineWidth = 2;
    
    const points = 8;
    const radius = Math.min(w, h) / 2;
    const seed = obstacle.id.charCodeAt(0) || 42;
    
    // Simple seeded random function
    const seededRandom = (n: number) => {
      const x = Math.sin(seed + n) * 10000;
      return x - Math.floor(x);
    };
    
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const r = radius * (0.7 + seededRandom(i) * 0.3);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (obstacle.type === 'mountain-peak') {
    // Draw triangular mountain peak
    ctx.fillStyle = '#8B7355';
    ctx.strokeStyle = '#6B5B4F';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Add snow cap
    ctx.fillStyle = '#E8E8E8';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w * 0.3, -h * 0.1);
    ctx.lineTo(w * 0.3, -h * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (obstacle.type === 'structure') {
    // Draw a chalet (alpine house)
    const roofHeight = h * 0.4;
    const wallHeight = h * 0.6;
    
    // Walls
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(-w / 2, h / 2 - wallHeight, w, wallHeight);
    
    // Roof
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2 - wallHeight);
    ctx.lineTo(0, h / 2 - wallHeight - roofHeight);
    ctx.lineTo(w / 2, h / 2 - wallHeight);
    ctx.closePath();
    ctx.fill();
    
    // Window
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-w * 0.15, h / 2 - wallHeight * 0.6, w * 0.3, h * 0.2);
    
    // Door
    ctx.fillStyle = '#654321';
    ctx.fillRect(w * 0.2, h / 2 - wallHeight * 0.3, w * 0.2, h * 0.3);
  } else {
    // Fallback: simple shape
    ctx.fillStyle = '#666666';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

export function drawMovingObstacle(ctx: CanvasRenderingContext2D, obstacle: MovingObstacle, _time: number = 0): void {
  const position = obstacle.currentPosition || obstacle.basePosition;
  const w = obstacle.bounds.width;
  const h = obstacle.bounds.height;

  // Draw floating island base first
  ctx.save();
  ctx.translate(position.x, position.y);
  drawFloatingIslandBase(ctx, w, h);
  // Render image if available, otherwise fallback
  const img = getObstacleImage(obstacle.type);
  if (img && img.complete && img.naturalWidth > 1) {
    // Draw image centered and scaled to fit
    const maxW = w * 0.9, maxH = h * 0.7;
    const scale = Math.min(maxW/img.naturalWidth, maxH/img.naturalHeight, 1);
    ctx.save();
    ctx.translate(0, -h*0.1);
    ctx.drawImage(img, -img.naturalWidth/2*scale, -img.naturalHeight/2*scale, img.naturalWidth*scale, img.naturalHeight*scale);
    ctx.restore();
    ctx.restore();
    return;
  }
  ctx.restore();

  // Draw cable line first (in world coordinates)
  if (obstacle.type === 'ski-lift' && obstacle.cablePath) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 3;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(obstacle.cablePath.start.x, obstacle.cablePath.start.y);
    ctx.lineTo(obstacle.cablePath.end.x, obstacle.cablePath.end.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Draw obstacle at current position
  ctx.save();
  ctx.translate(position.x, position.y);
  
  if (obstacle.type === 'ski-lift') {
    // Car body
    ctx.fillStyle = '#FF6B6B';
    ctx.strokeStyle = '#CC5555';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    
    // Windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(-w * 0.3, -h * 0.2, w * 0.2, h * 0.3);
    ctx.fillRect(w * 0.1, -h * 0.2, w * 0.2, h * 0.3);
    
    // Cable attachment point
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(0, -h / 2 - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  } else if (obstacle.type === 'chalet') {
    ctx.translate(position.x, position.y);
    const roofHeight = h * 0.4;
    const wallHeight = h * 0.6;
    
    // Walls
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(-w / 2, h / 2 - wallHeight, w, wallHeight);
    
    // Roof
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.moveTo(-w / 2, h / 2 - wallHeight);
    ctx.lineTo(0, h / 2 - wallHeight - roofHeight);
    ctx.lineTo(w / 2, h / 2 - wallHeight);
    ctx.closePath();
    ctx.fill();
    
    // Window
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(-w * 0.15, h / 2 - wallHeight * 0.6, w * 0.3, h * 0.2);
  } else if (obstacle.type === 'slalom-flags') {
    ctx.translate(position.x, position.y);
    const flagCount = 4;
    const spacing = w / (flagCount + 1);
    
    for (let i = 1; i <= flagCount; i++) {
      const x = -w / 2 + spacing * i;
      const flagHeight = h * 0.6;
      
      // Pole
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, -h / 2);
      ctx.lineTo(x, h / 2);
      ctx.stroke();
      
      // Flag (alternating colors)
      ctx.fillStyle = i % 2 === 0 ? '#FF0000' : '#0000FF';
      ctx.beginPath();
      ctx.moveTo(x, -h / 2);
      ctx.lineTo(x + flagHeight * 0.6, -h / 2 + flagHeight * 0.3);
      ctx.lineTo(x, -h / 2 + flagHeight);
      ctx.closePath();
      ctx.fill();
    }
  } else if (obstacle.type === 'rising-peak') {
    ctx.translate(position.x, position.y);
    // Draw triangular mountain peak
    ctx.fillStyle = '#8B7355';
    ctx.strokeStyle = '#6B5B4F';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w / 2, h / 2);
    ctx.lineTo(w / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Snow cap
    ctx.fillStyle = '#E8E8E8';
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-w * 0.3, -h * 0.1);
    ctx.lineTo(w * 0.3, -h * 0.1);
    ctx.closePath();
    ctx.fill();
  } else if (obstacle.type === 'island') {
    ctx.translate(position.x, position.y);
    // Draw island with trees
    ctx.fillStyle = '#5A7A3A';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Add small trees on island
    const treeCount = 3;
    for (let i = 0; i < treeCount; i++) {
      const treeX = (i - 1) * (w / 4);
      const treeY = -h * 0.2;
      const treeSize = h * 0.3;
      
      ctx.fillStyle = '#2D5016';
      ctx.beginPath();
      ctx.moveTo(treeX, treeY);
      ctx.lineTo(treeX - treeSize * 0.3, treeY + treeSize);
      ctx.lineTo(treeX + treeSize * 0.3, treeY + treeSize);
      ctx.closePath();
      ctx.fill();
    }
  } else if (obstacle.type === 'platform') {
    ctx.translate(position.x, position.y);
    // Draw flat platform
    ctx.fillStyle = '#9B9B9B';
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 2;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    
    // Add texture lines
    ctx.strokeStyle = '#777777';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const y = -h / 2 + (h / 3) * i;
      ctx.beginPath();
      ctx.moveTo(-w / 2, y);
      ctx.lineTo(w / 2, y);
      ctx.stroke();
    }
  } else {
    // Fallback
    ctx.translate(position.x, position.y);
    ctx.fillStyle = '#666666';
    ctx.fillRect(-w / 2, -h / 2, w, h);
  }

  ctx.restore();
}

export function drawWindZone(ctx: CanvasRenderingContext2D, zone: WindZone, time: number = 0): void {
  ctx.save();
  
  const left = zone.position.x - zone.bounds.width / 2;
  const right = zone.position.x + zone.bounds.width / 2;
  const top = zone.position.y - zone.bounds.height / 2;
  const bottom = zone.position.y + zone.bounds.height / 2;
  
  const direction = zone.direction === 'left' ? -1 : 1;
  const wispCount = Math.floor((zone.bounds.width * zone.bounds.height) / 2000);
  
  // Draw snowy pixel border around wind zone edges
  const borderWidth = 3;
  ctx.fillStyle = '#FAFAFA';
  ctx.globalAlpha = 0.8;
  
  // Top border (snowy pixels)
  for (let x = left; x < right; x += 4) {
    if (Math.random() > 0.3) {
      ctx.fillRect(x, top, 3, borderWidth);
    }
  }
  // Bottom border
  for (let x = left; x < right; x += 4) {
    if (Math.random() > 0.3) {
      ctx.fillRect(x, bottom - borderWidth, 3, borderWidth);
    }
  }
  // Left border
  for (let y = top; y < bottom; y += 4) {
    if (Math.random() > 0.3) {
      ctx.fillRect(left, y, borderWidth, 3);
    }
  }
  // Right border
  for (let y = top; y < bottom; y += 4) {
    if (Math.random() > 0.3) {
      ctx.fillRect(right - borderWidth, y, borderWidth, 3);
    }
  }
  
  // Draw animated wind wisps (flowing in correct direction)
  for (let i = 0; i < wispCount; i++) {
    const seed = (zone.id.charCodeAt(0) + i) * 1000;
    const x = left + (seed % zone.bounds.width);
    const y = top + ((seed * 7) % zone.bounds.height);
    
    // Animate position based on time - wind flows in its direction
    const speed = 40 + (seed % 25);
    const offsetX = (time * speed * direction) % (zone.bounds.width * 2);
    const offsetY = Math.sin(time * 2 + seed * 0.01) * 8;
    
    const wispX = x + offsetX - (offsetX > zone.bounds.width ? zone.bounds.width * 2 : 0);
    const wispY = y + offsetY;
    
    if (wispX < left || wispX > right || wispY < top || wispY > bottom) continue;
    
    // Draw wisp as pixel-art style curved line (more visible)
    const wispLength = 25 + (seed % 20);
    const wispWidth = 3 + (seed % 2);
    const curve = (seed % 15) - 7;
    
    ctx.globalAlpha = 0.5 + (seed % 30) / 100;
    ctx.strokeStyle = zone.direction === 'left' ? '#87CEEB' : '#E0F6FF';
    ctx.lineWidth = wispWidth;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(wispX, wispY);
    for (let j = 1; j <= 6; j++) {
      const t = j / 6;
      const px = wispX + direction * wispLength * t;
      const py = wispY + Math.sin(t * Math.PI) * curve * t;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
    
    // Add small snowflake particles
    for (let p = 0; p < 4; p++) {
      const particleX = wispX + direction * (wispLength * 0.25 * (p + 1));
      const particleY = wispY + Math.sin((p + 1) * 0.15) * curve;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = '#FAFAFA';
      ctx.fillRect(Math.floor(particleX), Math.floor(particleY), 2, 2);
    }
  }
  
  ctx.restore();
}

export function drawNarrowPassage(ctx: CanvasRenderingContext2D, passage: NarrowPassage): void {
  ctx.save();
  ctx.globalAlpha = 0.3;

  ctx.fillStyle = '#90EE90';
  ctx.fillRect(
    passage.bounds.left,
    passage.bounds.top,
    passage.bounds.right - passage.bounds.left,
    passage.bounds.bottom - passage.bounds.top
  );

  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#228B22';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(
    passage.bounds.left,
    passage.bounds.top,
    passage.bounds.right - passage.bounds.left,
    passage.bounds.bottom - passage.bounds.top
  );
  ctx.setLineDash([]);

  ctx.restore();
}

export function drawObstacles(
  ctx: CanvasRenderingContext2D,
  staticObstacles: StaticObstacle[],
  movingObstacles: MovingObstacle[],
  time: number = 0
): void {
  for (const obstacle of staticObstacles) {
    drawStaticObstacle(ctx, obstacle);
  }
  for (const obstacle of movingObstacles) {
    drawMovingObstacle(ctx, obstacle, time);
  }
}

export function drawWindZones(ctx: CanvasRenderingContext2D, windZones: WindZone[], time: number = 0): void {
  for (const zone of windZones) {
    drawWindZone(ctx, zone, time);
  }
}

export function drawNarrowPassages(ctx: CanvasRenderingContext2D, passages: NarrowPassage[]): void {
  for (const passage of passages) {
    drawNarrowPassage(ctx, passage);
  }
}
