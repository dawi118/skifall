import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { Tool, SkierState } from '../types';
import { usePhysics } from '../hooks/usePhysics';
import { useCamera } from '../hooks/useCamera';
import { useDrawing } from '../hooks/useDrawing';
import { useTimer } from '../hooks/useTimer';
import { Toolbar } from './Toolbar';
import { Timer } from './Timer';
import { RoundComplete } from './RoundComplete';
import { COLORS, PLAYING_ZOOM, FINISH_ZONE_RADIUS } from '../lib/constants';
import { drawGrid, drawMarker, drawLines, drawLine, applyCameraTransform, calculateFitBounds } from '../lib/renderer';
import { drawSkier, calculateInitialPositions, type SkierRenderState } from '../lib/skier';
import { generateLevel, type Level } from '../lib/level-generator';
import './GameCanvas.css';

type TransitionPhase = 'idle' | 'skier-out' | 'portals-out' | 'camera-move' | 'portals-in' | 'skier-in' | 'zoom-in';

const ANIM_SPEED = 0.15;

function isAnimationDone(current: number, target: number): boolean {
  return Math.abs(current - target) < 0.02;
}

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);

  const [level, setLevel] = useState<Level>(() => generateLevel());
  const pendingLevelRef = useRef<Level | null>(null);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [currentTool, setCurrentTool] = useState<Tool>('hand');
  const [skierState, setSkierState] = useState<SkierState>('idle');
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);

  const [skierScale, setSkierScale] = useState(1);
  const [skierVisible, setSkierVisible] = useState(true);
  const [portalScale, setPortalScale] = useState(1);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [finishTime, setFinishTime] = useState<number | null>(null);
  const [showRoundComplete, setShowRoundComplete] = useState(false);

  const skierScaleTarget = useRef<number | null>(null);
  const portalScaleTarget = useRef<number | null>(null);

  const [skierRenderState, setSkierRenderState] = useState<SkierRenderState>(() =>
    calculateInitialPositions(level.start.x, level.start.y)
  );

  const physics = usePhysics();
  const camera = useCamera(level.start);
  const drawing = useDrawing();
  const timer = useTimer();

  const levelKey = useMemo(() => `${level.start.x}-${level.start.y}`, [level]);

  useEffect(() => {
    physics.initPhysics(level.start.x, level.start.y);
    setSkierRenderState(calculateInitialPositions(level.start.x, level.start.y));
    
    const bounds = calculateFitBounds(level.start, level.finish, canvasSize.width, canvasSize.height);
    camera.setCamera({ x: bounds.centerX, y: bounds.centerY, zoom: bounds.zoom });
    
    timer.reset();
    timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKey]);

  useEffect(() => {
    const physicsLineIds = new Set(physics.getLineIds());
    const drawingLineIds = new Set(drawing.lines.map((l) => l.id));
    
    for (const id of physicsLineIds) {
      if (!drawingLineIds.has(id)) {
        physics.removeLine(id);
      }
    }
    
    for (const line of drawing.lines) {
      if (!physicsLineIds.has(line.id)) {
        physics.addLine(line);
      }
    }
  }, [drawing.lines, physics]);

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

  useEffect(() => {
    if (transitionPhase === 'idle') return;

    if (transitionPhase === 'skier-out' && isAnimationDone(skierScale, 0)) {
      setSkierVisible(false);
      setTransitionPhase('portals-out');
      portalScaleTarget.current = 0;
    } else if (transitionPhase === 'portals-out' && isAnimationDone(portalScale, 0)) {
      if (pendingLevelRef.current) {
        setLevel(pendingLevelRef.current);
        drawing.clearLines();

        const bounds = calculateFitBounds(
          pendingLevelRef.current.start,
          pendingLevelRef.current.finish,
          canvasSize.width,
          canvasSize.height
        );
        camera.setCamera({ x: bounds.centerX, y: bounds.centerY, zoom: bounds.zoom });
        pendingLevelRef.current = null;
      }
      setTransitionPhase('camera-move');
      setTimeout(() => {
        setTransitionPhase('portals-in');
        portalScaleTarget.current = 1;
      }, 200);
    } else if (transitionPhase === 'portals-in' && isAnimationDone(portalScale, 1)) {
      setTransitionPhase('skier-in');
      setSkierVisible(true);
      setSkierScale(0);
      skierScaleTarget.current = 1;
    } else if (transitionPhase === 'skier-in' && isAnimationDone(skierScale, 1)) {
      setTransitionPhase('zoom-in');
      camera.animateToZoom(PLAYING_ZOOM);

      const animateToStart = () => {
        camera.setCamera(prev => ({
          ...prev,
          x: prev.x + (level.start.x - prev.x) * ANIM_SPEED,
          y: prev.y + (level.start.y - prev.y) * ANIM_SPEED,
        }));
      };
      const interval = setInterval(animateToStart, 16);
      setTimeout(() => {
        clearInterval(interval);
        camera.setCamera(prev => ({ ...prev, x: level.start.x, y: level.start.y }));
        setTransitionPhase('idle');
      }, 500);
    }
  }, [transitionPhase, skierScale, portalScale, camera, drawing, canvasSize, level.start]);

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
    drawMarker(ctx, level.start, 'START', COLORS.startZone, portalScale);
    drawMarker(ctx, level.finish, 'FINISH', COLORS.finishZone, portalScale);
    drawLines(ctx, drawing.lines, hoveredLineId, portalScale);

    if (drawing.currentStroke.length > 0) {
      drawLine(ctx, drawing.currentStroke);
    }

    if (skierVisible) {
      drawSkier(ctx, skierRenderState, skierScale);
    }

    ctx.restore();
  }, [canvasSize, camera.camera, level, drawing.lines, drawing.currentStroke, skierRenderState, hoveredLineId, skierScale, skierVisible, portalScale]);

  useEffect(() => {
    const loop = (time: number) => {
      const delta = lastTimeRef.current ? time - lastTimeRef.current : 16.67;
      lastTimeRef.current = time;

      if (skierState === 'moving' || skierState === 'fallen' || skierState === 'finished') {
        const result = physics.update(delta);
        setSkierRenderState(result);

        if (result.crashed && skierState === 'moving') {
          setSkierState('fallen');
        }

        if (skierState === 'moving' && !result.crashed) {
          const dx = result.skis.x - level.finish.x;
          const dy = result.skis.y - (level.finish.y - 20);
          if (dx * dx + dy * dy < FINISH_ZONE_RADIUS * FINISH_ZONE_RADIUS) {
            setSkierState('finished');
          }
        }

        camera.followTarget({ x: result.upper.x, y: result.upper.y });
      }

      camera.updateAnimation();

      if (skierScaleTarget.current !== null) {
        setSkierScale((prev) => {
          const target = skierScaleTarget.current!;
          const next = prev + (target - prev) * ANIM_SPEED;
          if (Math.abs(next - target) < 0.01) {
            skierScaleTarget.current = null;
            return target;
          }
          return next;
        });
      }

      if (portalScaleTarget.current !== null) {
        setPortalScale((prev) => {
          const target = portalScaleTarget.current!;
          const next = prev + (target - prev) * ANIM_SPEED;
          if (Math.abs(next - target) < 0.01) {
            portalScaleTarget.current = null;
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
  }, [skierState, physics, camera, render, level.finish]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (skierState === 'moving' || transitionPhase !== 'idle') return;
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
    [skierState, transitionPhase, currentTool, camera, drawing, physics]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (skierState === 'moving' || transitionPhase !== 'idle') return;
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
    [skierState, transitionPhase, currentTool, camera, drawing, physics]
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

  const handleMiddleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 && skierState !== 'moving' && transitionPhase === 'idle') {
        e.preventDefault();
        camera.handlePanStart(e.clientX, e.clientY);
      }
    },
    [camera, skierState, transitionPhase]
  );

  const handleMiddleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (skierState !== 'moving' && transitionPhase === 'idle') {
        camera.handlePanMove(e.clientX, e.clientY);
      }
    },
    [camera, skierState, transitionPhase]
  );

  const handleMiddleMouseUp = useCallback(() => camera.handlePanEnd(), [camera]);

  const handlePlay = useCallback(() => {
    if (skierState === 'idle' && transitionPhase === 'idle') {
      setSkierState('moving');
      physics.play();
      camera.animateToZoom(PLAYING_ZOOM);
    }
  }, [skierState, transitionPhase, physics, camera]);

  const handleReset = useCallback(() => {
    if (transitionPhase !== 'idle') return;

    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }

    setSkierState('idle');
    physics.reset();
    setShowRoundComplete(false);
    setFinishTime(null);

    setSkierVisible(false);
    camera.animateToZoom(1);
    camera.setCamera((prev) => ({ ...prev, x: level.start.x, y: level.start.y }));
    setSkierRenderState(calculateInitialPositions(level.start.x, level.start.y));

    setTimeout(() => {
      setSkierScale(0);
      setSkierVisible(true);
      skierScaleTarget.current = 1;
    }, 300);
  }, [physics, camera, level.start, transitionPhase]);

  const handleNewLevel = useCallback(() => {
    if (transitionPhase !== 'idle') return;

    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }

    pendingLevelRef.current = generateLevel();
    setSkierState('idle');
    physics.reset();
    timer.stop();
    setShowRoundComplete(false);
    setFinishTime(null);
    setTransitionPhase('skier-out');
    skierScaleTarget.current = 0;
  }, [physics, transitionPhase, timer]);

  const handleRetry = useCallback(() => {
    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }

    setShowRoundComplete(false);
    setFinishTime(null);
    setSkierState('idle');
    physics.reset();
    drawing.clearLines();
    timer.reset();
    timer.start();

    const bounds = calculateFitBounds(level.start, level.finish, canvasSize.width, canvasSize.height);
    
    setSkierVisible(false);
    camera.setCamera({ x: bounds.centerX, y: bounds.centerY, zoom: bounds.zoom });
    setSkierRenderState(calculateInitialPositions(level.start.x, level.start.y));

    setTimeout(() => {
      setSkierScale(0);
      setSkierVisible(true);
      skierScaleTarget.current = 1;
    }, 300);
  }, [physics, camera, level, drawing, timer, canvasSize]);

  const roundCompleteTimeoutRef = useRef<number | null>(null);
  const hasShownRoundComplete = useRef(false);

  useEffect(() => {
    if (skierState === 'finished' && !hasShownRoundComplete.current) {
      hasShownRoundComplete.current = true;
      setFinishTime(timer.timeElapsed);
      timer.stop();
      roundCompleteTimeoutRef.current = window.setTimeout(() => setShowRoundComplete(true), 500);
    } else if (skierState === 'fallen' && !hasShownRoundComplete.current) {
      timer.stop();
    } else if (skierState === 'idle') {
      hasShownRoundComplete.current = false;
    }
  }, [skierState, timer]);

  useEffect(() => {
    if (timer.isExpired && skierState === 'moving' && !hasShownRoundComplete.current) {
      hasShownRoundComplete.current = true;
      setSkierState('fallen');
      setFinishTime(null);
      roundCompleteTimeoutRef.current = window.setTimeout(() => setShowRoundComplete(true), 500);
    }
  }, [timer.isExpired, skierState]);

  const isTransitioning = transitionPhase !== 'idle';
  const showTimer = timer.isRunning || timer.isExpired || skierState === 'finished';
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

      {showTimer && (
        <Timer
          timeRemaining={timer.timeRemaining}
          isFinished={skierState === 'finished'}
        />
      )}

      <div className="top-controls">
        <button
          className={`start-btn ${skierState !== 'idle' ? 'reset' : ''}`}
          onClick={skierState !== 'idle' ? handleReset : handlePlay}
          disabled={isTransitioning}
        >
          {skierState !== 'idle' ? '↺ Reset' : 'Start'}
        </button>
        <button
          className="new-level-btn"
          onClick={handleNewLevel}
          disabled={isTransitioning}
        >
          New Level
        </button>
      </div>

      <Toolbar
        currentTool={currentTool}
        skierState={skierState}
        disabled={isTransitioning}
        onToolChange={(tool) => {
          setCurrentTool(tool);
          setHoveredLineId(null);
        }}
      />

      {showRoundComplete && (
        <RoundComplete
          timeElapsed={finishTime}
          onRetry={handleRetry}
          onNewLevel={handleNewLevel}
        />
      )}
    </div>
  );
}
