import { useRef, useEffect, useCallback, useState } from 'react';
import type { Point, Tool, SkierState } from '../types';
import { usePhysics } from '../hooks/usePhysics';
import { useCamera } from '../hooks/useCamera';
import { useDrawing } from '../hooks/useDrawing';
import { Toolbar } from './Toolbar';
import {
  COLORS,
  LINE_WIDTH,
  SKIER_WIDTH,
  SPAWN_POSITION,
  PLAYING_ZOOM,
} from '../lib/constants';
import {
  HEAD_RADIUS,
  UPPER_BODY_HEIGHT,
  LOWER_BODY_HEIGHT,
  LOWER_BODY_WIDTH,
  SKI_WIDTH,
  SKI_HEIGHT,
} from '../lib/physics';
import './GameCanvas.css';

// Helper drawing functions (pure functions, no hooks)
function drawGrid(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  cameraY: number,
  zoom: number,
  canvasWidth: number,
  canvasHeight: number
) {
  const gridSize = 50;
  
  // Calculate visible area in world coordinates (with padding)
  const viewWidth = canvasWidth / zoom;
  const viewHeight = canvasHeight / zoom;
  const padding = gridSize * 2;
  
  const left = cameraX - viewWidth / 2 - padding;
  const right = cameraX + viewWidth / 2 + padding;
  const top = cameraY - viewHeight / 2 - padding;
  const bottom = cameraY + viewHeight / 2 + padding;
  
  // Snap to grid
  const startX = Math.floor(left / gridSize) * gridSize;
  const endX = Math.ceil(right / gridSize) * gridSize;
  const startY = Math.floor(top / gridSize) * gridSize;
  const endY = Math.ceil(bottom / gridSize) * gridSize;

  ctx.strokeStyle = '#E5E7EB';
  ctx.lineWidth = 1;

  // Draw vertical lines
  for (let x = startX; x <= endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }

  // Draw horizontal lines
  for (let y = startY; y <= endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
}

function drawSpawnMarker(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = COLORS.startZone;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(SPAWN_POSITION.x, SPAWN_POSITION.y - 20, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = COLORS.startZone;
  ctx.font = 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('START', SPAWN_POSITION.x, SPAWN_POSITION.y - 60);
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  color: string,
  width: number
) {
  if (points.length < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }

  ctx.stroke();
}

// Skier dimensions
interface SkierRenderState {
  parts: {
    head: { x: number; y: number; angle: number };
    upper: { x: number; y: number; angle: number };
    lower: { x: number; y: number; angle: number };
    skis: { x: number; y: number; angle: number };
  };
  crashed: boolean;
}

function drawHead(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Head (yellow circle)
  ctx.fillStyle = '#FCD34D';
  ctx.beginPath();
  ctx.arc(0, 0, HEAD_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawUpperBody(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Upper body (torso)
  ctx.fillStyle = COLORS.skier;
  ctx.fillRect(-SKIER_WIDTH / 2, -UPPER_BODY_HEIGHT / 2, SKIER_WIDTH, UPPER_BODY_HEIGHT);

  ctx.restore();
}

function drawLowerBody(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Lower body (legs) - slightly narrower
  ctx.fillStyle = '#374151'; // Slightly lighter than body
  ctx.fillRect(-LOWER_BODY_WIDTH / 2, -LOWER_BODY_HEIGHT / 2, LOWER_BODY_WIDTH, LOWER_BODY_HEIGHT);

  ctx.restore();
}

function drawSkis(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Skis (red rectangle)
  ctx.fillStyle = COLORS.skis;
  ctx.fillRect(-SKI_WIDTH / 2, -SKI_HEIGHT / 2, SKI_WIDTH, SKI_HEIGHT);

  ctx.restore();
}

function drawSkier(ctx: CanvasRenderingContext2D, state: SkierRenderState, scale: number = 1) {
  const { head, upper, lower, skis } = state.parts;
  
  // Apply scale around the skier's center (upper body position)
  if (scale !== 1) {
    ctx.save();
    ctx.translate(upper.x, upper.y);
    ctx.scale(scale, scale);
    ctx.translate(-upper.x, -upper.y);
  }
  
  // Draw from back to front: skis, lower body, upper body, head
  drawSkis(ctx, skis.x, skis.y, skis.angle);
  drawLowerBody(ctx, lower.x, lower.y, lower.angle);
  drawUpperBody(ctx, upper.x, upper.y, upper.angle);
  drawHead(ctx, head.x, head.y, head.angle);
  
  if (scale !== 1) {
    ctx.restore();
  }
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [currentTool, setCurrentTool] = useState<Tool>('hand');
  const [skierState, setSkierState] = useState<SkierState>('idle');
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);
  const [skierScale, setSkierScale] = useState(1);
  const [skierVisible, setSkierVisible] = useState(true);
  const skierScaleTarget = useRef<number | null>(null);
  
  // Calculate initial positions (from bottom up)
  const skiCenterY = SPAWN_POSITION.y;
  const ankleY = skiCenterY - SKI_HEIGHT / 2;
  const lowerCenterY = ankleY - LOWER_BODY_HEIGHT / 2;
  const hipY = lowerCenterY - LOWER_BODY_HEIGHT / 2;
  const upperCenterY = hipY - UPPER_BODY_HEIGHT / 2;
  const neckY = upperCenterY - UPPER_BODY_HEIGHT / 2;
  const headCenterY = neckY - HEAD_RADIUS;

  const [skierRenderState, setSkierRenderState] = useState<SkierRenderState>({
    parts: {
      head: { x: SPAWN_POSITION.x, y: headCenterY, angle: 0 },
      upper: { x: SPAWN_POSITION.x, y: upperCenterY, angle: 0 },
      lower: { x: SPAWN_POSITION.x, y: lowerCenterY, angle: 0 },
      skis: { x: SPAWN_POSITION.x, y: skiCenterY, angle: 0 },
    },
    crashed: false,
  });

  const physics = usePhysics();
  const camera = useCamera();
  const drawing = useDrawing();

  // Initialize physics engine
  useEffect(() => {
    physics.initPhysics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync physics lines with drawing lines (handles HMR and state resets)
  useEffect(() => {
    const physicsLineIds = physics.getLineIds();
    const drawingLineIds = new Set(drawing.lines.map(l => l.id));
    
    // Remove any physics lines that don't exist in drawing state
    for (const physicsLineId of physicsLineIds) {
      if (!drawingLineIds.has(physicsLineId)) {
        physics.removeLine(physicsLineId);
      }
    }
  }, [drawing.lines, physics]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Render function (uses refs to avoid stale closure issues)
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;

    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Save context for camera transform
    ctx.save();

    // Apply camera transform
    const centerX = width / 2;
    const centerY = height / 2;
    ctx.translate(centerX, centerY);
    ctx.scale(camera.camera.zoom, camera.camera.zoom);
    ctx.translate(-camera.camera.x, -camera.camera.y);

    // Draw grid (extends infinitely)
    drawGrid(ctx, camera.camera.x, camera.camera.y, camera.camera.zoom, width, height);

    // Draw spawn point marker
    drawSpawnMarker(ctx);

    // Draw all completed lines (highlight hovered line for eraser)
    const HIGHLIGHT_COLOR = '#6366F1'; // Same purple as tool selection
    drawing.lines.forEach((line) => {
      const isHovered = line.id === hoveredLineId;
      const color = isHovered ? HIGHLIGHT_COLOR : COLORS.line;
      const width = isHovered ? LINE_WIDTH + 2 : LINE_WIDTH;
      drawLine(ctx, line.points, color, width);
    });

    // Draw current stroke (while drawing)
    if (drawing.currentStroke.length > 0) {
      drawLine(ctx, drawing.currentStroke, COLORS.line, LINE_WIDTH);
    }

    // Draw skier (with scale animation and visibility)
    if (skierVisible) {
      drawSkier(ctx, skierRenderState, skierScale);
    }

    // Restore context
    ctx.restore();
  }, [canvasSize, camera.camera, drawing.lines, drawing.currentStroke, skierRenderState, hoveredLineId, skierScale, skierVisible]);

  // Game loop
  useEffect(() => {
    const gameLoop = (time: number) => {
      const delta = lastTimeRef.current ? time - lastTimeRef.current : 16.67;
      lastTimeRef.current = time;

      // Update physics if skier is moving or crashed (still animate crash)
      if (skierState === 'moving' || skierState === 'fallen') {
        const result = physics.update(delta);
        setSkierRenderState(result);

        // Update state if just crashed
        if (result.crashed && skierState === 'moving') {
          setSkierState('fallen');
        }

        // Follow skier upper body with camera
        camera.followTarget({ x: result.parts.upper.x, y: result.parts.upper.y });
      }

      // Update camera animation (smooth zoom transitions)
      camera.updateAnimation();

      // Update skier scale animation (pop-in effect)
      if (skierScaleTarget.current !== null) {
        setSkierScale((prev) => {
          const target = skierScaleTarget.current!;
          const newScale = prev + (target - prev) * 0.15; // Faster lerp for snappy pop
          if (Math.abs(newScale - target) < 0.01) {
            skierScaleTarget.current = null;
            return target;
          }
          return newScale;
        });
      }

      // Render
      render();

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [skierState, physics, camera, render]);

  // Handle pointer events for tools
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (skierState === 'moving') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      if (currentTool === 'hand') {
        camera.handlePanStart(e.clientX, e.clientY);
        setIsPanning(true);
      } else if (currentTool === 'pencil') {
        const worldPoint = camera.screenToWorld(e.clientX, e.clientY, rect);
        drawing.startDrawing(worldPoint);
      } else if (currentTool === 'eraser') {
        const worldPoint = camera.screenToWorld(e.clientX, e.clientY, rect);
        const erasedId = drawing.eraseLine(worldPoint);
        if (erasedId) {
          physics.removeLine(erasedId);
        }
      }
    },
    [skierState, currentTool, camera, drawing, physics]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (skierState === 'moving') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();

      if (currentTool === 'hand') {
        camera.handlePanMove(e.clientX, e.clientY);
        setHoveredLineId(null);
      } else if (currentTool === 'pencil') {
        if (drawing.isDrawing) {
          const worldPoint = camera.screenToWorld(e.clientX, e.clientY, rect);
          drawing.continueDrawing(worldPoint);
        }
        setHoveredLineId(null);
      } else if (currentTool === 'eraser') {
        const worldPoint = camera.screenToWorld(e.clientX, e.clientY, rect);
        
        // Check for hover
        const lineAtPoint = drawing.getLineAtPoint(worldPoint);
        setHoveredLineId(lineAtPoint);
        
        // Erase if clicking/dragging
        if (e.buttons > 0 && lineAtPoint) {
          const erasedId = drawing.eraseLine(worldPoint);
          if (erasedId) {
            physics.removeLine(erasedId);
            setHoveredLineId(null);
          }
        }
      }
    },
    [skierState, currentTool, camera, drawing, physics]
  );

  const handlePointerUp = useCallback(() => {
    if (currentTool === 'hand') {
      camera.handlePanEnd();
      setIsPanning(false);
    } else if (currentTool === 'pencil') {
      const newLine = drawing.endDrawing();
      if (newLine) {
        physics.addLine(newLine);
      }
    }
  }, [currentTool, camera, drawing, physics]);

  // Handle wheel for zoom (always allowed, even when moving)
  // Use a ref for the handler to avoid re-adding the event listener on every render
  // (the `camera` object changes identity on each render due to useState)
  const handleWheelRef = useRef(camera.handleWheel);
  handleWheelRef.current = camera.handleWheel;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      handleWheelRef.current(e);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []); // Empty deps - handler accessed via stable ref

  // Handle middle-mouse pan
  const handleMiddleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 && skierState !== 'moving') {
        e.preventDefault();
        camera.handlePanStart(e.clientX, e.clientY);
      }
    },
    [camera, skierState]
  );

  const handleMiddleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (skierState !== 'moving') {
        camera.handlePanMove(e.clientX, e.clientY);
      }
    },
    [camera, skierState]
  );

  const handleMiddleMouseUp = useCallback(() => {
    camera.handlePanEnd();
  }, [camera]);

  // Toolbar handlers
  const handlePlay = useCallback(() => {
    if (skierState === 'idle') {
      setSkierState('moving');
      physics.play();
      // Smoothly animate camera to playing zoom level
      camera.animateToZoom(PLAYING_ZOOM);
    }
  }, [skierState, physics, camera]);

  const handleReset = useCallback(() => {
    setSkierState('idle');
    physics.reset();
    
    // Hide skier and animate camera zoom out
    setSkierVisible(false);
    camera.animateToZoom(1);
    
    // Move camera back to spawn
    camera.setCamera((prev) => ({
      ...prev,
      x: SPAWN_POSITION.x,
      y: SPAWN_POSITION.y,
    }));
    
    // Reset skier position
    setSkierRenderState({
      parts: {
        head: { x: SPAWN_POSITION.x, y: headCenterY, angle: 0 },
        upper: { x: SPAWN_POSITION.x, y: upperCenterY, angle: 0 },
        lower: { x: SPAWN_POSITION.x, y: lowerCenterY, angle: 0 },
        skis: { x: SPAWN_POSITION.x, y: skiCenterY, angle: 0 },
      },
      crashed: false,
    });
    
    // After a moment, pop the skier back in with scale animation
    setTimeout(() => {
      setSkierScale(0);
      setSkierVisible(true);
      // Start the scale-up animation
      skierScaleTarget.current = 1;
    }, 300);
  }, [physics, camera, headCenterY, upperCenterY, lowerCenterY, skiCenterY]);

  return (
    <div className="game-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={`game-canvas tool-${currentTool}${isPanning ? ' panning' : ''}${hoveredLineId ? ' eraser-hover' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseDown={handleMiddleMouseDown}
        onMouseMove={handleMiddleMouseMove}
        onMouseUp={handleMiddleMouseUp}
        onMouseLeave={handleMiddleMouseUp}
      />
      
      {/* Top right controls */}
      <div className="top-controls">
        <button
          className={`start-btn ${skierState !== 'idle' ? 'reset' : ''}`}
          onClick={skierState !== 'idle' ? handleReset : handlePlay}
        >
          {skierState !== 'idle' ? '↺ Reset' : 'Start'}
        </button>
      </div>

      <Toolbar
        currentTool={currentTool}
        skierState={skierState}
        onToolChange={(tool) => {
          setCurrentTool(tool);
          setHoveredLineId(null);
        }}
      />
    </div>
  );
}
