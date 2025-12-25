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
  addLine: (line: Line) => void;
  removeLine: (lineId: string) => void;
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

  const continueDrawing = useCallback((point: Point) => {
    if (!isDrawing) return;
    setCurrentStroke((prev) => [...prev, point]);
  }, [isDrawing]);

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
    let erasedLineId: string | null = null;

    setLines((prev) => {
      const lineToErase = prev.find((line) => isPointNearLine(point, line));
      if (lineToErase) {
        erasedLineId = lineToErase.id;
        return prev.filter((line) => line.id !== lineToErase.id);
      }
      return prev;
    });

    return erasedLineId;
  }, []);

  const getLineAtPoint = useCallback((point: Point): string | null => {
    const hoveredLine = lines.find((line) => isPointNearLine(point, line));
    return hoveredLine ? hoveredLine.id : null;
  }, [lines]);

  const addLine = useCallback((line: Line) => {
    setLines((prev) => [...prev, line]);
  }, []);

  const removeLine = useCallback((lineId: string) => {
    setLines((prev) => prev.filter((line) => line.id !== lineId));
  }, []);

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
    addLine,
    removeLine,
    clearLines,
  };
}

