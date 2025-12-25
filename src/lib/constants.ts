// Game constants

// Physics
export const GRAVITY = 1;

// Skier dimensions
export const SKIER_WIDTH = 20;
export const SKIER_HEIGHT = 30;

// Line drawing
export const LINE_WIDTH = 4;
export const LINE_COLOR = '#333333';

// Camera
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;
export const ZOOM_SPEED = 0.001;
export const PAN_SPEED = 1;

// Spawn position (will be replaced by level generator in Phase 2)
export const SPAWN_POSITION = { x: 200, y: 100 };

// Colors
export const COLORS = {
  background: '#FAFAFA',
  skier: '#1F2937',
  skis: '#EF4444',
  line: '#333333',
  startZone: '#3B82F6',
  finishZone: '#22C55E',
} as const;

