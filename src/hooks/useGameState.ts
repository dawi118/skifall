import { useState, useCallback, useRef } from 'react';
import { generateLevel, type Level } from '../lib/level-generator';
import { calculateScore } from '../lib/scoring';

export type RoundPhase = 'ready' | 'playing' | 'finished';

export interface RoundResult {
  finishTime: number | null;
  score: number;
}

interface UseGameStateReturn {
  level: Level;
  pendingLevel: Level | null;
  roundResult: RoundResult | null;
  generateNextLevel: () => void;
  applyPendingLevel: () => void;
  setLevel: (level: Level) => void;
  finishRound: (finishTime: number | null) => void;
  resetRound: () => void;
}

export function useGameState(initialLevel?: Level | null): UseGameStateReturn {
  const [level, setLevelState] = useState<Level>(() => initialLevel ?? generateLevel());
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const pendingLevelRef = useRef<Level | null>(null);
  const [pendingLevel, setPendingLevel] = useState<Level | null>(null);

  const generateNextLevel = useCallback(() => {
    const next = generateLevel();
    pendingLevelRef.current = next;
    setPendingLevel(next);
  }, []);

  const applyPendingLevel = useCallback(() => {
    if (pendingLevelRef.current) {
      setLevelState(pendingLevelRef.current);
      pendingLevelRef.current = null;
      setPendingLevel(null);
      setRoundResult(null);
    }
  }, []);

  const setLevel = useCallback((newLevel: Level) => {
    setLevelState(newLevel);
    setRoundResult(null);
  }, []);

  const finishRound = useCallback((finishTime: number | null) => {
    setRoundResult({
      finishTime,
      score: calculateScore(finishTime),
    });
  }, []);

  const resetRound = useCallback(() => {
    setRoundResult(null);
  }, []);

  return {
    level,
    pendingLevel,
    roundResult,
    generateNextLevel,
    applyPendingLevel,
    setLevel,
    finishRound,
    resetRound,
  };
}
