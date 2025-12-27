export interface Point {
  x: number;
  y: number;
}

const BOUNDING_BOX = (width: number, height: number): Point[] => [
  { x: 0, y: 0 },
  { x: width, y: 0 },
  { x: width, y: height },
  { x: 0, y: height },
];

export function extractCollisionPolygon(
  image: HTMLImageElement,
  threshold: number = 128
): Point[] {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return BOUNDING_BOX(image.width, image.height);

  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const data = imageData.data;
  
  const opaquePixels: Point[] = [];
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const idx = (y * image.width + x) * 4;
      if (data[idx + 3] >= threshold) {
        opaquePixels.push({ x, y });
      }
    }
  }
  
  if (opaquePixels.length === 0) {
    return BOUNDING_BOX(image.width, image.height);
  }
  
  const edgePixels: Point[] = [];
  for (const pixel of opaquePixels) {
    const { x, y } = pixel;
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
    ];
    
    for (const neighbor of neighbors) {
      if (neighbor.x < 0 || neighbor.x >= image.width ||
          neighbor.y < 0 || neighbor.y >= image.height) {
        edgePixels.push(pixel);
        break;
      }
      
      const idx = (neighbor.y * image.width + neighbor.x) * 4;
      if (data[idx + 3] < threshold) {
        edgePixels.push(pixel);
        break;
      }
    }
  }
  
  if (edgePixels.length === 0) {
    return BOUNDING_BOX(image.width, image.height);
  }
  
  const hull = createConvexHull(edgePixels);
  
  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    area += hull[i].x * hull[j].y - hull[j].x * hull[i].y;
  }
  
  return area < 0 ? hull.reverse() : hull;
}

function createConvexHull(points: Point[]): Point[] {
  if (points.length <= 3) return points;
  
  let bottom = 0;
  for (let i = 1; i < points.length; i++) {
    if (points[i].y < points[bottom].y ||
        (points[i].y === points[bottom].y && points[i].x < points[bottom].x)) {
      bottom = i;
    }
  }
  
  [points[0], points[bottom]] = [points[bottom], points[0]];
  
  const pivot = points[0];
  points.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
    const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);
    if (angleA !== angleB) return angleA - angleB;
    const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
    const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
    return distA - distB;
  });
  
  const hull: Point[] = [points[0], points[1]];
  
  for (let i = 2; i < points.length; i++) {
    while (hull.length > 1 && 
           crossProduct(hull[hull.length - 2], hull[hull.length - 1], points[i]) <= 0) {
      hull.pop();
    }
    hull.push(points[i]);
  }
  
  return hull;
}

function crossProduct(o: Point, a: Point, b: Point): number {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

export function simplifyPolygon(vertices: Point[], tolerance: number = 2): Point[] {
  if (vertices.length <= 4) return vertices;
  
  let maxDist = 0;
  let maxIndex = 0;
  const end = vertices.length - 1;
  
  for (let i = 1; i < end; i++) {
    const dist = pointToLineDistance(vertices[i], vertices[0], vertices[end]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }
  
  if (maxDist > tolerance) {
    const left = simplifyPolygon(vertices.slice(0, maxIndex + 1), tolerance);
    const right = simplifyPolygon(vertices.slice(maxIndex), tolerance);
    return [...left.slice(0, -1), ...right];
  }
  
  return [vertices[0], vertices[end]];
}

function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;
  
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  
  if (lenSq !== 0) param = dot / lenSq;
  
  let xx: number, yy: number;
  
  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }
  
  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

