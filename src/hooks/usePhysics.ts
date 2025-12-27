import { useRef, useCallback } from 'react';
import {
  createPhysicsEngine,
  addLineToWorld,
  removeLineFromWorld,
  resetSkier,
  startSkier,
  stepPhysics,
  getSkierState,
  addObstaclesToWorld,
  setWindZones,
  type PhysicsEngine,
} from '../lib/physics';
import type { Line } from '../types';
import type { SkierRenderState } from '../lib/skier';
import type { StaticObstacle, WindZone } from '../lib/level-generator';

interface UsePhysicsReturn {
  initPhysics: (spawnX: number, spawnY: number) => void;
  addLine: (line: Line) => void;
  removeLine: (lineId: string) => void;
  getLineIds: () => string[];
  setObstacles: (obstacles: StaticObstacle[]) => void;
  setWindZones: (zones: WindZone[]) => void;
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

  const setObstacles = useCallback((obstacles: StaticObstacle[]) => {
    if (engineRef.current) {
      addObstaclesToWorld(engineRef.current, obstacles);
    }
  }, []);

  const setWindZonesCallback = useCallback((zones: WindZone[]) => {
    if (engineRef.current) {
      setWindZones(engineRef.current, zones);
    }
  }, []);

  const play = useCallback(() => {
    if (engineRef.current) {
      startSkier(engineRef.current);
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

  return {
    initPhysics,
    addLine,
    removeLine,
    getLineIds,
    setObstacles,
    setWindZones: setWindZonesCallback,
    reset,
    play,
    update,
  };
}
