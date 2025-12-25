import { useState, useCallback, useRef } from 'react';
import type { Camera, Point } from '../types';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_SPEED, SPAWN_POSITION } from '../lib/constants';

interface UseCameraReturn {
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  handleWheel: (e: WheelEvent) => void;
  handlePanStart: (clientX: number, clientY: number) => void;
  handlePanMove: (clientX: number, clientY: number) => void;
  handlePanEnd: () => void;
  followTarget: (target: Point) => void;
  resetCamera: () => void;
  animateToZoom: (targetZoom: number) => void;
  updateAnimation: () => void;
  screenToWorld: (screenX: number, screenY: number, canvasRect: DOMRect) => Point;
  worldToScreen: (worldX: number, worldY: number, canvasRect: DOMRect) => Point;
}

// Smooth interpolation factor (0-1, higher = faster)
const CAMERA_LERP_SPEED = 0.08;

function lerp(current: number, target: number, factor: number): number {
  return current + (target - current) * factor;
}

export function useCamera(): UseCameraReturn {
  // Camera position is the world coordinate at the center of the screen
  const [camera, setCamera] = useState<Camera>({
    x: SPAWN_POSITION.x,
    y: SPAWN_POSITION.y,
    zoom: 1,
  });

  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const targetZoom = useRef<number | null>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setCamera((prev) => {
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, prev.zoom - e.deltaY * ZOOM_SPEED)
      );
      return { ...prev, zoom: newZoom };
    });
  }, []);

  const handlePanStart = useCallback((clientX: number, clientY: number) => {
    isPanning.current = true;
    lastPanPosition.current = { x: clientX, y: clientY };
  }, []);

  const handlePanMove = useCallback((clientX: number, clientY: number) => {
    if (!isPanning.current) return;

    const dx = clientX - lastPanPosition.current.x;
    const dy = clientY - lastPanPosition.current.y;

    setCamera((prev) => ({
      ...prev,
      x: prev.x - dx / prev.zoom,
      y: prev.y - dy / prev.zoom,
    }));

    lastPanPosition.current = { x: clientX, y: clientY };
  }, []);

  const handlePanEnd = useCallback(() => {
    isPanning.current = false;
  }, []);

  const followTarget = useCallback((target: Point) => {
    setCamera((prev) => ({
      ...prev,
      x: target.x,
      y: target.y,
    }));
  }, []);

  const resetCamera = useCallback(() => {
    targetZoom.current = null;
    setCamera({
      x: SPAWN_POSITION.x,
      y: SPAWN_POSITION.y,
      zoom: 1,
    });
  }, []);

  const animateToZoom = useCallback((zoom: number) => {
    targetZoom.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  }, []);

  const updateAnimation = useCallback(() => {
    // Early exit if no animation target
    if (targetZoom.current === null) return;
    
    // CRITICAL: Capture target BEFORE calling setCamera to avoid race conditions.
    // If we read targetZoom.current inside the setCamera callback, multiple 
    // animation frames could queue up before React processes them, and by the 
    // time the second callback runs, targetZoom.current might already be null.
    const target = targetZoom.current;
    
    setCamera((prev) => {
      const newZoom = lerp(prev.zoom, target, CAMERA_LERP_SPEED);
      
      // Stop animating when close enough - snap to exact target
      if (Math.abs(newZoom - target) < 0.001) {
        targetZoom.current = null;
        return { ...prev, zoom: target };
      }
      
      return { ...prev, zoom: newZoom };
    });
  }, []);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback(
    (screenX: number, screenY: number, canvasRect: DOMRect): Point => {
      const canvasCenterX = canvasRect.width / 2;
      const canvasCenterY = canvasRect.height / 2;

      // screenX/Y is relative to viewport, convert to canvas-relative
      const canvasX = screenX - canvasRect.left;
      const canvasY = screenY - canvasRect.top;

      // Convert from screen space to world space
      const worldX = camera.x + (canvasX - canvasCenterX) / camera.zoom;
      const worldY = camera.y + (canvasY - canvasCenterY) / camera.zoom;

      return { x: worldX, y: worldY };
    },
    [camera]
  );

  // Convert world coordinates to screen coordinates
  const worldToScreen = useCallback(
    (worldX: number, worldY: number, canvasRect: DOMRect): Point => {
      const canvasCenterX = canvasRect.width / 2;
      const canvasCenterY = canvasRect.height / 2;

      const screenX = (worldX - camera.x) * camera.zoom + canvasCenterX;
      const screenY = (worldY - camera.y) * camera.zoom + canvasCenterY;

      return { x: screenX, y: screenY };
    },
    [camera]
  );

  return {
    camera,
    setCamera,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    followTarget,
    resetCamera,
    animateToZoom,
    updateAnimation,
    screenToWorld,
    worldToScreen,
  };
}

