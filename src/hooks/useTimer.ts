import { useState, useRef, useCallback, useEffect } from 'react';
import { ROUND_DURATION_SECONDS } from '../lib/constants';

interface UseTimerReturn {
  timeRemaining: number;
  timeElapsed: number;
  isRunning: boolean;
  isExpired: boolean;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getElapsedTime: () => number;
}

export function useTimer(duration = ROUND_DURATION_SECONDS): UseTimerReturn {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isExpired, setIsExpired] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!isRunning) return;

    const tick = () => {
      if (startTimeRef.current === null || !isRunningRef.current) return;

      const now = performance.now();
      const elapsed = (now - startTimeRef.current) / 1000;
      const remaining = Math.max(0, duration - elapsed);

      setTimeElapsed(elapsed);
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        setIsExpired(true);
        setIsRunning(false);
        isRunningRef.current = false;
        startTimeRef.current = null;
        return;
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isRunning, duration]);

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    startTimeRef.current = performance.now();
    isRunningRef.current = true;
    setIsRunning(true);
    setIsExpired(false);
  }, []);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setTimeRemaining(duration);
    setTimeElapsed(0);
    setIsExpired(false);
    startTimeRef.current = null;
  }, [stop, duration]);

  const getElapsedTime = useCallback(() => {
    if (startTimeRef.current === null) return timeElapsed;
    return (performance.now() - startTimeRef.current) / 1000;
  }, [timeElapsed]);

  return {
    timeRemaining,
    timeElapsed,
    isRunning,
    isExpired,
    start,
    stop,
    reset,
    getElapsedTime,
  };
}
