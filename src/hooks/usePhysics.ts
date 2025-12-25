import { useRef, useCallback, useEffect } from 'react';
import {
  createPhysicsEngine,
  addLineToWorld,
  removeLineFromWorld,
  resetSkier,
  startSkier,
  stepPhysics,
  getSkierPosition,
  getSkierAngle,
  type PhysicsEngine,
} from '../lib/physics';
import type { Line, Point } from '../types';

interface UsePhysicsReturn {
  physicsRef: React.MutableRefObject<PhysicsEngine | null>;
  initPhysics: () => void;
  addLine: (line: Line) => void;
  removeLine: (lineId: string) => void;
  reset: () => void;
  play: () => void;
  update: (delta: number) => { position: Point; angle: number };
  getPosition: () => Point;
}

export function usePhysics(): UsePhysicsReturn {
  const physicsRef = useRef<PhysicsEngine | null>(null);

  const initPhysics = useCallback(() => {
    physicsRef.current = createPhysicsEngine();
  }, []);

  const addLine = useCallback((line: Line) => {
    if (physicsRef.current) {
      addLineToWorld(physicsRef.current, line);
    }
  }, []);

  const removeLine = useCallback((lineId: string) => {
    if (physicsRef.current) {
      removeLineFromWorld(physicsRef.current, lineId);
    }
  }, []);

  const reset = useCallback(() => {
    if (physicsRef.current) {
      resetSkier(physicsRef.current);
    }
  }, []);

  const play = useCallback(() => {
    if (physicsRef.current) {
      startSkier(physicsRef.current);
    }
  }, []);

  const update = useCallback((delta: number) => {
    if (physicsRef.current) {
      stepPhysics(physicsRef.current, delta);
      return {
        position: getSkierPosition(physicsRef.current),
        angle: getSkierAngle(physicsRef.current),
      };
    }
    return { position: { x: 0, y: 0 }, angle: 0 };
  }, []);

  const getPosition = useCallback(() => {
    if (physicsRef.current) {
      return getSkierPosition(physicsRef.current);
    }
    return { x: 0, y: 0 };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      physicsRef.current = null;
    };
  }, []);

  return {
    physicsRef,
    initPhysics,
    addLine,
    removeLine,
    reset,
    play,
    update,
    getPosition,
  };
}

