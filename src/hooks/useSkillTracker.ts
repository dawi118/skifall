import { useRef, useCallback, useState } from 'react';
import type { SkierPhysicsState } from '../lib/physics';

export interface TrickEvent {
  id: string;
  type: 'ski' | 'air' | '360' | 'switchback';
  points: number;
  position: { x: number; y: number };
  timestamp: number;
}

interface SkillTrackerState {
  score: number;
  skiTimeAccum: number;      // Accumulated time skiing (ms)
  airTimeAccum: number;      // Accumulated time in air going up (ms)
  rotationAccum: number;     // Accumulated rotation while in air (radians)
  wasGrounded: boolean;      // Previous frame grounded state
  lastVelocityX: number;     // Previous velocity.x for switchback detection
  switchbackCooldown: number; // Prevent rapid switchback triggers
}

interface UseSkillTrackerReturn {
  skillScore: number;
  events: TrickEvent[];
  update: (physics: SkierPhysicsState, deltaMs: number) => void;
  reset: () => void;
  clearEvents: () => void;
}

const SKI_INTERVAL = 200;      // Award ski points every 200ms
const AIR_INTERVAL = 200;      // Award air points every 200ms
const FULL_ROTATION = Math.PI * 2; // 360 degrees
const SWITCHBACK_COOLDOWN = 500;   // ms between switchback awards
const MIN_VELOCITY_FOR_SWITCHBACK = 50; // Minimum velocity to count switchback
const MIN_SPEED_FOR_SKI = 60;  // Minimum speed (px/s) to earn ski points

let eventIdCounter = 0;

export function useSkillTracker(): UseSkillTrackerReturn {
  const [skillScore, setSkillScore] = useState(0);
  const [events, setEvents] = useState<TrickEvent[]>([]);
  
  const stateRef = useRef<SkillTrackerState>({
    score: 0,
    skiTimeAccum: 0,
    airTimeAccum: 0,
    rotationAccum: 0,
    wasGrounded: true,
    lastVelocityX: 0,
    switchbackCooldown: 0,
  });

  const addEvent = useCallback((type: TrickEvent['type'], points: number, position: { x: number; y: number }) => {
    const event: TrickEvent = {
      id: `trick-${eventIdCounter++}`,
      type,
      points,
      position,
      timestamp: Date.now(),
    };
    
    stateRef.current.score += points;
    setSkillScore(stateRef.current.score);
    setEvents(prev => [...prev, event]);
    
    setTimeout(() => {
      setEvents(prev => prev.filter(e => e.id !== event.id));
    }, 1500);
  }, []);

  const update = useCallback((physics: SkierPhysicsState, deltaMs: number) => {
    if (physics.crashed) return;
    
    const state = stateRef.current;
    const { position, velocity, isGrounded } = physics;
    
    // Update cooldowns
    state.switchbackCooldown = Math.max(0, state.switchbackCooldown - deltaMs);
    
    // --- SKI POINTS (+1 per 0.2s grounded while moving) ---
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (isGrounded && speed >= MIN_SPEED_FOR_SKI) {
      state.skiTimeAccum += deltaMs;
      while (state.skiTimeAccum >= SKI_INTERVAL) {
        state.skiTimeAccum -= SKI_INTERVAL;
        addEvent('ski', 1, position);
      }
    } else if (isGrounded) {
      // Grounded but too slow - reset accumulator
      state.skiTimeAccum = 0;
    }
    
    // Reset air tracking when grounded
    if (isGrounded) {
      state.airTimeAccum = 0;
    }
    
    // --- AIR POINTS (+2 per 0.2s rising in air) ---
    if (!isGrounded && velocity.y < 0) { // y < 0 means going up (screen coords)
      state.airTimeAccum += deltaMs;
      while (state.airTimeAccum >= AIR_INTERVAL) {
        state.airTimeAccum -= AIR_INTERVAL;
        addEvent('air', 2, position);
      }
    } else if (!isGrounded) {
      // In air but not rising - don't accumulate
      state.airTimeAccum = 0;
    }
    
    // --- 360 DETECTION (landed after full rotation, front or back flip) ---
    if (!isGrounded) {
      // Accumulate absolute rotation while in air (works for both directions)
      state.rotationAccum += Math.abs(physics.angularVelocity) * (deltaMs / 1000);
    }
    
    // Check for landing with rotation
    if (isGrounded && !state.wasGrounded) {
      // Just landed - check if we completed a 360
      if (state.rotationAccum >= FULL_ROTATION) {
        const numRotations = Math.floor(state.rotationAccum / FULL_ROTATION);
        addEvent('360', 10 * numRotations, position);
      }
      state.rotationAccum = 0;
    }
    
    // --- SWITCHBACK DETECTION (velocity.x sign change) ---
    const currentVelX = velocity.x;
    const lastVelX = state.lastVelocityX;
    
    // Check for significant velocity and sign change
    if (
      state.switchbackCooldown === 0 &&
      Math.abs(currentVelX) > MIN_VELOCITY_FOR_SWITCHBACK &&
      Math.abs(lastVelX) > MIN_VELOCITY_FOR_SWITCHBACK &&
      Math.sign(currentVelX) !== Math.sign(lastVelX) &&
      Math.sign(lastVelX) !== 0
    ) {
      addEvent('switchback', 5, position);
      state.switchbackCooldown = SWITCHBACK_COOLDOWN;
    }
    
    // Update previous frame state
    state.wasGrounded = isGrounded;
    state.lastVelocityX = currentVelX;
  }, [addEvent]);

  const reset = useCallback(() => {
    stateRef.current = {
      score: 0,
      skiTimeAccum: 0,
      airTimeAccum: 0,
      rotationAccum: 0,
      wasGrounded: true,
      lastVelocityX: 0,
      switchbackCooldown: 0,
    };
    setSkillScore(0);
    setEvents([]);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    skillScore,
    events,
    update,
    reset,
    clearEvents,
  };
}

