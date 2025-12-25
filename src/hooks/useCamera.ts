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
  followTarget: (target: Point) => void;
  animateToZoom: (targetZoom: number) => void;
  updateAnimation: () => void;
  screenToWorld: (screenX: number, screenY: number, canvasRect: DOMRect) => Point;
}

const CAMERA_LERP_SPEED = 0.08;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
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
    followTarget,
    animateToZoom,
    updateAnimation,
    screenToWorld,
  };
}
