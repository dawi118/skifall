import { useRef, useCallback } from 'react';
import {
  createPhysicsEngine,
  addLineToWorld,
  removeLineFromWorld,
  resetSkier,
  startSkier,
  stepPhysics,
  getSkierState,
  addStaticObstacle,
  addMovingObstacle,
  clearObstacles as clearObstaclesInEngine,
  setWindZones as setWindZonesInEngine,
  type PhysicsEngine,
} from '../lib/physics';
import type { Line, StaticObstacle, MovingObstacle, WindZone } from '../types';
import type { SkierRenderState } from '../lib/skier';

interface UsePhysicsReturn {
  initPhysics: (spawnX: number, spawnY: number) => void;
  addLine: (line: Line) => void;
  removeLine: (lineId: string) => void;
  getLineIds: () => string[];
  addStaticObstacles: (obstacles: StaticObstacle[]) => void;
  addMovingObstacles: (obstacles: MovingObstacle[], startTime?: number) => void;
  setWindZones: (zones: WindZone[]) => void;
  clearObstacles: () => void;
  reset: () => void;
  play: () => void;
  update: (delta: number) => SkierRenderState;
}

export function usePhysics(): UsePhysicsReturn {
  const engineRef = useRef<PhysicsEngine | null>(null);

  const initPhysics = useCallback((spawnX: number, spawnY: number) => {
    engineRef.current = createPhysicsEngine(spawnX, spawnY);
  }, []);

  const addLine = useCallback((line: Line) => {
    if (engineRef.current) {
      addLineToWorld(engineRef.current, line);
    }
  }, []);

  const removeLine = useCallback((lineId: string) => {
    if (engineRef.current) {
      removeLineFromWorld(engineRef.current, lineId);
    }
  }, []);

  const getLineIds = useCallback((): string[] => {
    if (engineRef.current) {
      return Array.from(engineRef.current.lineFixtures.keys());
    }
    return [];
  }, []);

  const reset = useCallback(() => {
    if (engineRef.current) {
      resetSkier(engineRef.current);
    }
  }, []);

  const play = useCallback(() => {
    if (engineRef.current) {
      startSkier(engineRef.current);
    }
  }, []);

  const addStaticObstacles = useCallback((obstacles: StaticObstacle[]) => {
    if (engineRef.current) {
      for (const obstacle of obstacles) {
        addStaticObstacle(engineRef.current, obstacle);
      }
    }
  }, []);

  const addMovingObstacles = useCallback((obstacles: MovingObstacle[], startTime: number = 0) => {
    if (engineRef.current) {
      for (const obstacle of obstacles) {
        addMovingObstacle(engineRef.current, obstacle, startTime);
      }
    }
  }, []);

  const setWindZones = useCallback((zones: WindZone[]) => {
    if (engineRef.current) {
      setWindZonesInEngine(engineRef.current, zones);
    }
  }, []);

  const clearObstacles = useCallback(() => {
    if (engineRef.current) {
      clearObstaclesInEngine(engineRef.current);
    }
  }, []);

  const update = useCallback((delta: number): SkierRenderState => {
    if (engineRef.current) {
      stepPhysics(engineRef.current, delta);
      return getSkierState(engineRef.current);
    }
    return {
      head: { x: 0, y: 0, angle: 0 },
      upper: { x: 0, y: 0, angle: 0 },
      lower: { x: 0, y: 0, angle: 0 },
      skis: { x: 0, y: 0, angle: 0 },
      crashed: false,
    };
  }, []);

  // Note: We intentionally don't clean up engineRef on unmount because
  // React StrictMode double-mounts components, which would destroy the engine
  // between the init effect and when play is called. The physics engine is
  // lightweight and will be garbage collected when the component truly unmounts.

  return {
    initPhysics,
    addLine,
    removeLine,
    getLineIds,
    addStaticObstacles,
    addMovingObstacles,
    setWindZones,
    clearObstacles,
    reset,
    play,
    update,
  };
}
