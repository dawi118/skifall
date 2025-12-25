import { useRef, useCallback, useEffect } from 'react';
import {
  createPhysicsEngine,
  addLineToWorld,
  removeLineFromWorld,
  resetSkier,
  startSkier,
  stepPhysics,
  getSkierPosition,
  getSkierParts,
  hasCrashed,
  type PhysicsEngine,
  type SkierParts,
} from '../lib/physics';
import type { Line, Point } from '../types';

interface SkierState {
  parts: SkierParts;
  crashed: boolean;
}

interface UsePhysicsReturn {
  physicsRef: React.MutableRefObject<PhysicsEngine | null>;
  initPhysics: () => void;
  addLine: (line: Line) => void;
  removeLine: (lineId: string) => void;
  reset: () => void;
  play: () => void;
  update: (delta: number) => SkierState;
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

  const update = useCallback((delta: number): SkierState => {
    if (physicsRef.current) {
      stepPhysics(physicsRef.current, delta);
      return {
        parts: getSkierParts(physicsRef.current),
        crashed: hasCrashed(physicsRef.current),
      };
    }
    return {
      parts: {
        head: { x: 0, y: 0, angle: 0 },
        upper: { x: 0, y: 0, angle: 0 },
        lower: { x: 0, y: 0, angle: 0 },
        skis: { x: 0, y: 0, angle: 0 },
      },
      crashed: false,
    };
  }, []);

  const getPosition = useCallback(() => {
    if (physicsRef.current) {
      return getSkierPosition(physicsRef.current);
    }
    return { x: 0, y: 0 };
  }, []);

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
