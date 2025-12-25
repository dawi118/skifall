import { useState, useCallback } from 'react';
import type { Point, Line } from '../types';
import { createLine, isPointNearLine } from '../lib/line-utils';

interface UseDrawingReturn {
  lines: Line[];
  currentStroke: Point[];
  isDrawing: boolean;
  startDrawing: (point: Point) => void;
  continueDrawing: (point: Point) => void;
  endDrawing: () => Line | null;
  eraseLine: (point: Point) => string | null;
  getLineAtPoint: (point: Point) => string | null;
  clearLines: () => void;
}

export function useDrawing(): UseDrawingReturn {
  const [lines, setLines] = useState<Line[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  const startDrawing = useCallback((point: Point) => {
    setIsDrawing(true);
    setCurrentStroke([point]);
  }, []);

  const continueDrawing = useCallback(
    (point: Point) => {
      if (!isDrawing) return;
      setCurrentStroke((prev) => [...prev, point]);
    },
    [isDrawing]
  );

  const endDrawing = useCallback((): Line | null => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return null;
    }

    const newLine = createLine(currentStroke);
    setLines((prev) => [...prev, newLine]);
    setIsDrawing(false);
    setCurrentStroke([]);
    return newLine;
  }, [isDrawing, currentStroke]);

  const eraseLine = useCallback((point: Point): string | null => {
    let erasedId: string | null = null;
    setLines((prev) => {
      const target = prev.find((line) => isPointNearLine(point, line));
      if (target) {
        erasedId = target.id;
        return prev.filter((line) => line.id !== target.id);
      }
      return prev;
    });
    return erasedId;
  }, []);

  const getLineAtPoint = useCallback(
    (point: Point): string | null => {
      const line = lines.find((l) => isPointNearLine(point, l));
      return line?.id ?? null;
    },
    [lines]
  );

  const clearLines = useCallback(() => {
    setLines([]);
  }, []);

  return {
    lines,
    currentStroke,
    isDrawing,
    startDrawing,
    continueDrawing,
    endDrawing,
    eraseLine,
    getLineAtPoint,
    clearLines,
  };
}
