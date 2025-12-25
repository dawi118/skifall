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
  SKIER_HEIGHT,
  SPAWN_POSITION,
} from '../lib/constants';
import './GameCanvas.css';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [currentTool, setCurrentTool] = useState<Tool>('pencil');
  const [skierState, setSkierState] = useState<SkierState>('idle');
  const [skierPosition, setSkierPosition] = useState<Point>(SPAWN_POSITION);
  const [skierAngle, setSkierAngle] = useState(0);

  const physics = usePhysics();
  const camera = useCamera(canvasSize);
  const drawing = useDrawing();

  // Initialize physics engine
  useEffect(() => {
    physics.initPhysics();
  }, []);

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

  // Game loop
  useEffect(() => {
    const gameLoop = (time: number) => {
      const delta = lastTimeRef.current ? time - lastTimeRef.current : 16.67;
      lastTimeRef.current = time;

      // Update physics if skier is moving
      if (skierState === 'moving') {
        const result = physics.update(delta);
        setSkierPosition(result.position);
        setSkierAngle(result.angle);

        // Follow skier with camera
        camera.followTarget(result.position);
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
  }, [skierState, physics, camera]);

  // Render function
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

    // Draw grid (for reference)
    drawGrid(ctx);

    // Draw spawn point marker
    drawSpawnMarker(ctx);

    // Draw all completed lines
    drawing.lines.forEach((line) => {
      drawLine(ctx, line.points, COLORS.line, LINE_WIDTH);
    });

    // Draw current stroke (while drawing)
    if (drawing.currentStroke.length > 0) {
      drawLine(ctx, drawing.currentStroke, COLORS.line, LINE_WIDTH);
    }

    // Draw skier
    drawSkier(ctx, skierPosition, skierAngle);

    // Restore context
    ctx.restore();
  }, [canvasSize, camera.camera, drawing.lines, drawing.currentStroke, skierPosition, skierAngle]);

  // Draw a grid for visual reference
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 50;
    const extent = 2000;

    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;

    for (let x = -extent; x <= extent; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, -extent);
      ctx.lineTo(x, extent);
      ctx.stroke();
    }

    for (let y = -extent; y <= extent; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(-extent, y);
      ctx.lineTo(extent, y);
      ctx.stroke();
    }
  };

  // Draw spawn point marker
  const drawSpawnMarker = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = COLORS.startZone;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(SPAWN_POSITION.x, SPAWN_POSITION.y, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Draw "START" text
    ctx.fillStyle = COLORS.startZone;
    ctx.font = 'bold 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('START', SPAWN_POSITION.x, SPAWN_POSITION.y - 40);
  };

  // Draw a line from points
  const drawLine = (
    ctx: CanvasRenderingContext2D,
    points: Point[],
    color: string,
    width: number
  ) => {
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
  };

  // Draw the skier
  const drawSkier = (ctx: CanvasRenderingContext2D, position: Point, angle: number) => {
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);

    // Body (rectangle)
    ctx.fillStyle = COLORS.skier;
    ctx.fillRect(-SKIER_WIDTH / 2, -SKIER_HEIGHT / 2, SKIER_WIDTH, SKIER_HEIGHT);

    // Skis (red line at bottom)
    ctx.strokeStyle = COLORS.skis;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-SKIER_WIDTH / 2 - 5, SKIER_HEIGHT / 2);
    ctx.lineTo(SKIER_WIDTH / 2 + 10, SKIER_HEIGHT / 2);
    ctx.stroke();

    // Face indicator (small circle at top)
    ctx.fillStyle = '#FCD34D';
    ctx.beginPath();
    ctx.arc(0, -SKIER_HEIGHT / 2 + 5, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  // Handle pointer events for drawing
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (skierState === 'moving') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const worldPoint = camera.screenToWorld(e.clientX, e.clientY, rect);

      if (currentTool === 'pencil') {
        drawing.startDrawing(worldPoint);
      } else if (currentTool === 'eraser') {
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

      if (currentTool === 'pencil' && drawing.isDrawing) {
        const worldPoint = camera.screenToWorld(e.clientX, e.clientY, rect);
        drawing.continueDrawing(worldPoint);
      } else if (currentTool === 'eraser' && e.buttons > 0) {
        const worldPoint = camera.screenToWorld(e.clientX, e.clientY, rect);
        const erasedId = drawing.eraseLine(worldPoint);
        if (erasedId) {
          physics.removeLine(erasedId);
        }
      }
    },
    [skierState, currentTool, camera, drawing, physics]
  );

  const handlePointerUp = useCallback(() => {
    if (currentTool === 'pencil') {
      const newLine = drawing.endDrawing();
      if (newLine) {
        physics.addLine(newLine);
      }
    }
  }, [currentTool, drawing, physics]);

  // Handle wheel for zoom
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      if (skierState !== 'moving') {
        camera.handleWheel(e);
      }
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [camera, skierState]);

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
    }
  }, [skierState, physics]);

  const handleReset = useCallback(() => {
    setSkierState('idle');
    physics.reset();
    setSkierPosition(SPAWN_POSITION);
    setSkierAngle(0);
    camera.resetCamera();
  }, [physics, camera]);

  return (
    <div className="game-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="game-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseDown={handleMiddleMouseDown}
        onMouseMove={handleMiddleMouseMove}
        onMouseUp={handleMiddleMouseUp}
        onMouseLeave={handleMiddleMouseUp}
      />
      <Toolbar
        currentTool={currentTool}
        skierState={skierState}
        onToolChange={setCurrentTool}
        onPlay={handlePlay}
        onReset={handleReset}
      />
    </div>
  );
}

