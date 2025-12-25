import { useRef, useEffect, useCallback, useState } from 'react';
import type { Tool, SkierState } from '../types';
import { usePhysics } from '../hooks/usePhysics';
import { useCamera } from '../hooks/useCamera';
import { useDrawing } from '../hooks/useDrawing';
import { Toolbar } from './Toolbar';
import { COLORS, PLAYING_ZOOM } from '../lib/constants';
import { drawGrid, drawMarker, drawLines, drawLine, applyCameraTransform } from '../lib/renderer';
import { drawSkier, calculateInitialPositions, type SkierRenderState } from '../lib/skier';
import './GameCanvas.css';

// Hardcoded for now - will come from level generator in Phase 2
const SPAWN_POSITION = { x: 200, y: 100 };

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

  const [skierRenderState, setSkierRenderState] = useState<SkierRenderState>(() =>
    calculateInitialPositions(SPAWN_POSITION.x, SPAWN_POSITION.y)
  );

  const physics = usePhysics();
  const camera = useCamera(SPAWN_POSITION);
  const drawing = useDrawing();

  // Initialize physics
  useEffect(() => {
    physics.initPhysics(SPAWN_POSITION.x, SPAWN_POSITION.y);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync physics lines with drawing lines (handles HMR and state resets)
  useEffect(() => {
    const physicsLineIds = physics.getLineIds();
    const drawingLineIds = new Set(drawing.lines.map((l) => l.id));

    for (const id of physicsLineIds) {
      if (!drawingLineIds.has(id)) {
        physics.removeLine(id);
      }
    }
  }, [drawing.lines, physics]);

  // Handle resize
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

  // Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvasSize;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    applyCameraTransform(ctx, camera.camera, width, height);

    drawGrid(ctx, camera.camera, width, height);
    drawMarker(ctx, SPAWN_POSITION, 'START', COLORS.startZone);
    drawLines(ctx, drawing.lines, hoveredLineId);

    if (drawing.currentStroke.length > 0) {
      drawLine(ctx, drawing.currentStroke);
    }

    if (skierVisible) {
      drawSkier(ctx, skierRenderState, skierScale);
    }

    ctx.restore();
  }, [canvasSize, camera.camera, drawing.lines, drawing.currentStroke, skierRenderState, hoveredLineId, skierScale, skierVisible]);

  // Game loop
  useEffect(() => {
    const loop = (time: number) => {
      const delta = lastTimeRef.current ? time - lastTimeRef.current : 16.67;
      lastTimeRef.current = time;

      if (skierState === 'moving' || skierState === 'fallen') {
        const result = physics.update(delta);
        setSkierRenderState(result);

        if (result.crashed && skierState === 'moving') {
          setSkierState('fallen');
        }

        camera.followTarget({ x: result.upper.x, y: result.upper.y });
      }

      camera.updateAnimation();

      if (skierScaleTarget.current !== null) {
        setSkierScale((prev) => {
          const target = skierScaleTarget.current!;
          const next = prev + (target - prev) * 0.15;
          if (Math.abs(next - target) < 0.01) {
            skierScaleTarget.current = null;
            return target;
          }
          return next;
        });
      }

      render();
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [skierState, physics, camera, render]);

  // --- Input Handlers ---

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
        drawing.startDrawing(camera.screenToWorld(e.clientX, e.clientY, rect));
      } else if (currentTool === 'eraser') {
        const point = camera.screenToWorld(e.clientX, e.clientY, rect);
        const erasedId = drawing.eraseLine(point);
        if (erasedId) physics.removeLine(erasedId);
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
          drawing.continueDrawing(camera.screenToWorld(e.clientX, e.clientY, rect));
        }
        setHoveredLineId(null);
      } else if (currentTool === 'eraser') {
        const point = camera.screenToWorld(e.clientX, e.clientY, rect);
        setHoveredLineId(drawing.getLineAtPoint(point));
        if (e.buttons > 0) {
          const erasedId = drawing.eraseLine(point);
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
      if (newLine) physics.addLine(newLine);
    }
  }, [currentTool, camera, drawing, physics]);

  // Wheel zoom (always allowed, even while moving)
  const handleWheelRef = useRef(camera.handleWheel);
  useEffect(() => {
    handleWheelRef.current = camera.handleWheel;
  }, [camera.handleWheel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => handleWheelRef.current(e);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  // Middle-mouse pan
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
      if (skierState !== 'moving') camera.handlePanMove(e.clientX, e.clientY);
    },
    [camera, skierState]
  );

  const handleMiddleMouseUp = useCallback(() => camera.handlePanEnd(), [camera]);

  // --- Actions ---

  const handlePlay = useCallback(() => {
    if (skierState === 'idle') {
      setSkierState('moving');
      physics.play();
      camera.animateToZoom(PLAYING_ZOOM);
    }
  }, [skierState, physics, camera]);

  const handleReset = useCallback(() => {
    setSkierState('idle');
    physics.reset();

    setSkierVisible(false);
    camera.animateToZoom(1);
    camera.setCamera((prev) => ({ ...prev, x: SPAWN_POSITION.x, y: SPAWN_POSITION.y }));
    setSkierRenderState(calculateInitialPositions(SPAWN_POSITION.x, SPAWN_POSITION.y));

    setTimeout(() => {
      setSkierScale(0);
      setSkierVisible(true);
      skierScaleTarget.current = 1;
    }, 300);
  }, [physics, camera]);

  // --- Render ---

  const canvasClass = `game-canvas tool-${currentTool}${isPanning ? ' panning' : ''}${hoveredLineId ? ' eraser-hover' : ''}`;

  return (
    <div className="game-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className={canvasClass}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onMouseDown={handleMiddleMouseDown}
        onMouseMove={handleMiddleMouseMove}
        onMouseUp={handleMiddleMouseUp}
        onMouseLeave={handleMiddleMouseUp}
      />

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
