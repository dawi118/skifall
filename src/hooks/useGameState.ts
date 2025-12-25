import { useState, useCallback } from 'react';
import { generateLevel, type Level } from '../lib/level-generator';
import { calculateScore } from '../lib/scoring';

export type RoundPhase = 'ready' | 'playing' | 'finished';

export interface RoundResult {
  finishTime: number | null;
  score: number;
}

interface UseGameStateReturn {
  level: Level;
  roundPhase: RoundPhase;
  roundResult: RoundResult | null;
  newLevel: () => void;
  startRound: () => void;
  finishRound: (finishTime: number) => void;
  dnfRound: () => void;
  resetRound: () => void;
}

export function useGameState(): UseGameStateReturn {
  const [level, setLevel] = useState<Level>(() => generateLevel());
  const [roundPhase, setRoundPhase] = useState<RoundPhase>('ready');
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  const newLevel = useCallback(() => {
    setLevel(generateLevel());
    setRoundPhase('ready');
    setRoundResult(null);
  }, []);

  const startRound = useCallback(() => {
    setRoundPhase('playing');
    setRoundResult(null);
  }, []);

  const finishRound = useCallback((finishTime: number) => {
    setRoundResult({ finishTime, score: calculateScore(finishTime) });
    setRoundPhase('finished');
  }, []);

  const dnfRound = useCallback(() => {
    setRoundResult({ finishTime: null, score: calculateScore(null) });
    setRoundPhase('finished');
  }, []);

  const resetRound = useCallback(() => {
    setRoundPhase('ready');
  }, []);

  return {
    level,
    roundPhase,
    roundResult,
    newLevel,
    startRound,
    finishRound,
    dnfRound,
    resetRound,
  };
}
