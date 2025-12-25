export interface Point {
  x: number;
  y: number;
}

export interface Line {
  id: string;
  points: Point[];
}

export type Tool = 'hand' | 'pencil' | 'eraser';

export type SkierState = 'idle' | 'moving' | 'fallen' | 'finished';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}
