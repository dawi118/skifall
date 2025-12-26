import { useState, useCallback, useRef } from 'react';
import type { Camera, Point } from '../types';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_SPEED } from '../lib/constants';

interface UseCameraReturn {
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
  handleWheel: (e: WheelEvent) => void;
  handlePanStart: (clientX: number, clientY: number) => void;
  handlePanMove: (clientX: number, clientY: number) => void;
  handlePanEnd: () => void;
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: () => void;
  isPinching: () => boolean;
  followTarget: (target: Point) => void;
  animateToZoom: (targetZoom: number) => void;
  updateAnimation: () => void;
  screenToWorld: (screenX: number, screenY: number, canvasRect: DOMRect) => Point;
}

const CAMERA_LERP_SPEED = 0.08;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getTouchDistance(t1: Touch, t2: Touch): number {
  const dx = t1.clientX - t2.clientX;
  const dy = t1.clientY - t2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function getTouchMidpoint(t1: Touch, t2: Touch): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

export function useCamera(initialPosition: Point = { x: 0, y: 0 }): UseCameraReturn {
  const [camera, setCamera] = useState<Camera>({
    x: initialPosition.x,
    y: initialPosition.y,
    zoom: 1,
  });

  const isPanning = useRef(false);
  const lastPanPosition = useRef({ x: 0, y: 0 });
  const targetZoom = useRef<number | null>(null);
  
  // Pinch-to-zoom state
  const pinchState = useRef<{
    active: boolean;
    initialDistance: number;
    initialZoom: number;
    lastMidpoint: { x: number; y: number };
  } | null>(null);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    targetZoom.current = null;
    setCamera((prev) => ({
      ...prev,
      zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev.zoom - e.deltaY * ZOOM_SPEED)),
    }));
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

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      // Start pinch-to-zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchState.current = {
        active: true,
        initialDistance: getTouchDistance(t1, t2),
        initialZoom: camera.zoom,
        lastMidpoint: getTouchMidpoint(t1, t2),
      };
      isPanning.current = false; // Cancel any single-finger pan
    } else if (e.touches.length === 1 && !pinchState.current?.active) {
      // Single finger pan
      const touch = e.touches[0];
      isPanning.current = true;
      lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [camera.zoom]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && pinchState.current?.active) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const currentDistance = getTouchDistance(t1, t2);
      const currentMidpoint = getTouchMidpoint(t1, t2);
      
      // Calculate zoom
      const scale = currentDistance / pinchState.current.initialDistance;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchState.current.initialZoom * scale));
      
      // Calculate pan from midpoint movement
      const dx = currentMidpoint.x - pinchState.current.lastMidpoint.x;
      const dy = currentMidpoint.y - pinchState.current.lastMidpoint.y;
      
      setCamera((prev) => ({
        x: prev.x - dx / prev.zoom,
        y: prev.y - dy / prev.zoom,
        zoom: newZoom,
      }));
      
      pinchState.current.lastMidpoint = currentMidpoint;
    } else if (e.touches.length === 1 && isPanning.current && !pinchState.current?.active) {
      // Single finger pan
      const touch = e.touches[0];
      const dx = touch.clientX - lastPanPosition.current.x;
      const dy = touch.clientY - lastPanPosition.current.y;
      setCamera((prev) => ({
        ...prev,
        x: prev.x - dx / prev.zoom,
        y: prev.y - dy / prev.zoom,
      }));
      lastPanPosition.current = { x: touch.clientX, y: touch.clientY };
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchState.current = null;
    isPanning.current = false;
  }, []);

  const isPinching = useCallback(() => {
    return pinchState.current?.active ?? false;
  }, []);

  const followTarget = useCallback((target: Point) => {
    setCamera((prev) => ({ ...prev, x: target.x, y: target.y }));
  }, []);

  const animateToZoom = useCallback((zoom: number) => {
    targetZoom.current = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
  }, []);

  const updateAnimation = useCallback(() => {
    if (targetZoom.current === null) return;
    const target = targetZoom.current;
    setCamera((prev) => {
      const newZoom = lerp(prev.zoom, target, CAMERA_LERP_SPEED);
      if (Math.abs(newZoom - target) < 0.001) {
        targetZoom.current = null;
        return { ...prev, zoom: target };
      }
      return { ...prev, zoom: newZoom };
    });
  }, []);

  const screenToWorld = useCallback(
    (screenX: number, screenY: number, rect: DOMRect): Point => {
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      return {
        x: camera.x + (screenX - rect.left - cx) / camera.zoom,
        y: camera.y + (screenY - rect.top - cy) / camera.zoom,
      };
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
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isPinching,
    followTarget,
    animateToZoom,
    updateAnimation,
    screenToWorld,
  };
}
