import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import type { Tool } from '../types';
import { useLocalPlayer } from '../hooks/useLocalPlayer';
import { useGameState } from '../hooks/useGameState';
import { useCamera } from '../hooks/useCamera';
import { useTimer } from '../hooks/useTimer';
import { Toolbar } from './Toolbar';
import { Timer } from './Timer';
import { RoundComplete } from './RoundComplete';
import { COLORS, PLAYING_ZOOM, FINISH_ZONE_RADIUS } from '../lib/constants';
import { drawGrid, drawMarker, drawLines, drawLine, applyCameraTransform, calculateFitBounds } from '../lib/renderer';
import { drawSkier } from '../lib/skier';
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

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [currentTool, setCurrentTool] = useState<Tool>('hand');
  const [isPanning, setIsPanning] = useState(false);
  const [hoveredLineId, setHoveredLineId] = useState<string | null>(null);

  const [skierScale, setSkierScale] = useState(1);
  const [skierVisible, setSkierVisible] = useState(true);
  const [portalScale, setPortalScale] = useState(1);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>('idle');
  const [showRoundComplete, setShowRoundComplete] = useState(false);

  const skierScaleTarget = useRef<number | null>(null);
  const portalScaleTarget = useRef<number | null>(null);
  const roundCompleteTimeoutRef = useRef<number | null>(null);
  const hasShownRoundComplete = useRef(false);

  const gameState = useGameState();
  const { player, actions } = useLocalPlayer();
  const camera = useCamera(gameState.level.start);
  const timer = useTimer();

  const level = gameState.level;
  const levelKey = useMemo(() => `${level.start.x}-${level.start.y}`, [level]);

  // Initialize player at level start
  useEffect(() => {
    actions.initAtSpawn(level.start.x, level.start.y);
    
    const bounds = calculateFitBounds(level.start, level.finish, canvasSize.width, canvasSize.height);
    camera.setCamera({ x: bounds.centerX, y: bounds.centerY, zoom: bounds.zoom });
    
    timer.reset();
    timer.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelKey]);

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

  // Transition state machine
  useEffect(() => {
    if (transitionPhase === 'idle') return;

    if (transitionPhase === 'skier-out' && isAnimationDone(skierScale, 0)) {
      setSkierVisible(false);
      setTransitionPhase('portals-out');
      portalScaleTarget.current = 0;
    } else if (transitionPhase === 'portals-out' && isAnimationDone(portalScale, 0)) {
      if (gameState.pendingLevel) {
        gameState.applyPendingLevel();
        actions.clearLines();

        const bounds = calculateFitBounds(
          gameState.pendingLevel.start,
          gameState.pendingLevel.finish,
          canvasSize.width,
          canvasSize.height
        );
        camera.setCamera({ x: bounds.centerX, y: bounds.centerY, zoom: bounds.zoom });
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
  }, [transitionPhase, skierScale, portalScale, camera, actions, canvasSize, level.start, gameState]);

  // Render function
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
    drawLines(ctx, player.lines, hoveredLineId, portalScale);

    if (player.currentStroke.length > 0) {
      drawLine(ctx, player.currentStroke);
    }

    if (skierVisible) {
      drawSkier(ctx, player.skierRenderState, skierScale);
    }

    ctx.restore();
  }, [canvasSize, camera.camera, level, player.lines, player.currentStroke, player.skierRenderState, hoveredLineId, skierScale, skierVisible, portalScale]);

  // Game loop
  useEffect(() => {
    const loop = (time: number) => {
      const delta = lastTimeRef.current ? time - lastTimeRef.current : 16.67;
      lastTimeRef.current = time;

      if (player.runState === 'moving' || player.runState === 'fallen' || player.runState === 'finished') {
        const result = actions.update(delta);

        if (player.runState === 'moving' && !result.crashed) {
          const dx = result.skis.x - level.finish.x;
          const dy = result.skis.y - (level.finish.y - 20);
          if (dx * dx + dy * dy < FINISH_ZONE_RADIUS * FINISH_ZONE_RADIUS) {
            actions.setRunState('finished');
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
  }, [player.runState, actions, camera, render, level.finish]);

  // Pointer handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (player.runState === 'moving' || transitionPhase !== 'idle') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      if (currentTool === 'hand') {
        camera.handlePanStart(e.clientX, e.clientY);
        setIsPanning(true);
      } else if (currentTool === 'pencil') {
        actions.startDrawing(camera.screenToWorld(e.clientX, e.clientY, rect));
      } else if (currentTool === 'eraser') {
        const point = camera.screenToWorld(e.clientX, e.clientY, rect);
        actions.eraseLine(point);
      }
    },
    [player.runState, transitionPhase, currentTool, camera, actions]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (player.runState === 'moving' || transitionPhase !== 'idle') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();

      if (currentTool === 'hand') {
        camera.handlePanMove(e.clientX, e.clientY);
        setHoveredLineId(null);
      } else if (currentTool === 'pencil') {
        if (player.isDrawing) {
          actions.continueDrawing(camera.screenToWorld(e.clientX, e.clientY, rect));
        }
        setHoveredLineId(null);
      } else if (currentTool === 'eraser') {
        const point = camera.screenToWorld(e.clientX, e.clientY, rect);
        setHoveredLineId(actions.getLineAtPoint(point));
        if (e.buttons > 0) {
          const erasedId = actions.eraseLine(point);
          if (erasedId) {
            setHoveredLineId(null);
          }
        }
      }
    },
    [player.runState, player.isDrawing, transitionPhase, currentTool, camera, actions]
  );

  const handlePointerUp = useCallback(() => {
    if (currentTool === 'hand') {
      camera.handlePanEnd();
      setIsPanning(false);
    } else if (currentTool === 'pencil') {
      actions.endDrawing();
    }
  }, [currentTool, camera, actions]);

  // Wheel handler
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

  // Middle mouse panning
  const handleMiddleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 && player.runState !== 'moving' && transitionPhase === 'idle') {
        e.preventDefault();
        camera.handlePanStart(e.clientX, e.clientY);
      }
    },
    [camera, player.runState, transitionPhase]
  );

  const handleMiddleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (player.runState !== 'moving' && transitionPhase === 'idle') {
        camera.handlePanMove(e.clientX, e.clientY);
      }
    },
    [camera, player.runState, transitionPhase]
  );

  const handleMiddleMouseUp = useCallback(() => camera.handlePanEnd(), [camera]);

  // Game actions
  const handlePlay = useCallback(() => {
    if (player.runState === 'idle' && transitionPhase === 'idle') {
      actions.play();
      camera.animateToZoom(PLAYING_ZOOM);
    }
  }, [player.runState, transitionPhase, actions, camera]);

  const handleReset = useCallback(() => {
    if (transitionPhase !== 'idle') return;

    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }

    actions.reset(level.start.x, level.start.y);
    gameState.resetRound();
    setShowRoundComplete(false);

    setSkierVisible(false);
    camera.animateToZoom(1);
    camera.setCamera((prev) => ({ ...prev, x: level.start.x, y: level.start.y }));

    setTimeout(() => {
      setSkierScale(0);
      setSkierVisible(true);
      skierScaleTarget.current = 1;
    }, 300);
  }, [actions, camera, level.start, transitionPhase, gameState]);

  const handleNewLevel = useCallback(() => {
    if (transitionPhase !== 'idle') return;

    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }

    gameState.generateNextLevel();
    actions.reset(level.start.x, level.start.y);
    timer.stop();
    setShowRoundComplete(false);
    setTransitionPhase('skier-out');
    skierScaleTarget.current = 0;
  }, [actions, level.start, transitionPhase, timer, gameState]);

  const handleRetry = useCallback(() => {
    if (roundCompleteTimeoutRef.current) {
      clearTimeout(roundCompleteTimeoutRef.current);
      roundCompleteTimeoutRef.current = null;
    }

    setShowRoundComplete(false);
    actions.reset(level.start.x, level.start.y);
    actions.clearLines();
    gameState.resetRound();
    timer.reset();
    timer.start();

    const bounds = calculateFitBounds(level.start, level.finish, canvasSize.width, canvasSize.height);
    
    setSkierVisible(false);
    camera.setCamera({ x: bounds.centerX, y: bounds.centerY, zoom: bounds.zoom });

    setTimeout(() => {
      setSkierScale(0);
      setSkierVisible(true);
      skierScaleTarget.current = 1;
    }, 300);
  }, [actions, camera, level, timer, canvasSize, gameState]);

  // Round complete logic
  useEffect(() => {
    if (player.runState === 'finished' && !hasShownRoundComplete.current) {
      hasShownRoundComplete.current = true;
      const finishTime = timer.timeElapsed;
      gameState.finishRound(finishTime);
      timer.stop();
      roundCompleteTimeoutRef.current = window.setTimeout(() => setShowRoundComplete(true), 500);
    } else if (player.runState === 'fallen' && !hasShownRoundComplete.current) {
      timer.stop();
    } else if (player.runState === 'idle') {
      hasShownRoundComplete.current = false;
    }
  }, [player.runState, timer, gameState]);

  useEffect(() => {
    const canDNF = player.runState === 'idle' || player.runState === 'moving';
    if (timer.isExpired && canDNF && !hasShownRoundComplete.current) {
      hasShownRoundComplete.current = true;
      actions.setRunState('fallen');
      gameState.finishRound(null);
      roundCompleteTimeoutRef.current = window.setTimeout(() => setShowRoundComplete(true), 500);
    }
  }, [timer.isExpired, player.runState, actions, gameState]);

  const isTransitioning = transitionPhase !== 'idle';
  const showTimer = timer.isRunning || timer.isExpired || player.runState === 'finished' || player.runState === 'fallen';
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
          isFinished={player.runState === 'finished'}
        />
      )}

      <div className="top-controls">
        <button
          className={`start-btn ${player.runState !== 'idle' ? 'reset' : ''}`}
          onClick={player.runState !== 'idle' ? handleReset : handlePlay}
          disabled={isTransitioning}
        >
          {player.runState !== 'idle' ? '↺ Reset' : 'Start'}
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
        skierState={player.runState}
        disabled={isTransitioning}
        onToolChange={(tool) => {
          setCurrentTool(tool);
          setHoveredLineId(null);
        }}
      />

      {showRoundComplete && gameState.roundResult && (
        <RoundComplete
          timeElapsed={gameState.roundResult.finishTime}
          onRetry={handleRetry}
          onNewLevel={handleNewLevel}
        />
      )}
    </div>
  );
}
