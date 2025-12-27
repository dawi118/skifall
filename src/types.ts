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

export interface SkierPartState {
  x: number;
  y: number;
  angle: number;
}

export interface SkierRenderState {
  head: SkierPartState;
  upper: SkierPartState;
  lower: SkierPartState;
  skis: SkierPartState;
  crashed: boolean;
}

export interface StaticObstacle {
  id: string;
  type: 'mountain-peak' | 'rock-formation' | 'tree' | 'structure';
  position: Point;
  bounds: { width: number; height: number };
  shape: 'rectangle' | 'circle' | 'polygon';
  vertices?: Point[];
}

export interface MovementPattern {
  type: 'linear' | 'circular' | 'oscillate' | 'figure8';
  speed: number; // px/s
  amplitude?: number; // for oscillate
  frequency?: number; // for oscillate
  radius?: number; // for circular
  direction: 'horizontal' | 'vertical' | 'diagonal';
  path?: Point[];
}

export interface MovingObstacle {
  id: string;
  type: 'ski-lift' | 'rising-peak' | 'platform' | 'island' | 'slalom-flags' | 'chalet';
  basePosition: Point;
  bounds: { width: number; height: number };
  movement: MovementPattern;
  collisionType: 'full' | 'pass-through-cable';
  cablePath?: { start: Point; end: Point };
  currentPosition?: Point; // runtime position
  angle?: number; // runtime angle
}

export interface WindZone {
  id: string;
  position: Point;
  bounds: { width: number; height: number };
  direction: 'left' | 'right';
  strength: number; // force multiplier (0.5-2.0)
  shape: 'vertical-column' | 'horizontal-band';
}

export interface NarrowPassage {
  id: string;
  position: Point; // center point
  width: number; // minimum 50px
  height: number;
  bounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
  type: 'static-gap' | 'dynamic-gap' | 'terrain-gate' | 'slalom';
}
