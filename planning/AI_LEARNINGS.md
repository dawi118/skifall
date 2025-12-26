# AI Learnings

Concise directives for working on this codebase, ordered by frequency of relevance.

## Code Quality (3x)
- **Remove comments that restate code** - constant names like `SKIER_BROADCAST_INTERVAL` are self-documenting
- **Extract duplicate patterns into helpers** - e.g., `animateToward()` for animation easing, `lerpBodyPart()` for interpolation
- **Prefer ternary for simple conditional assignment** - cleaner than nested if/else

## React Patterns (3x)
- **Refs for mutable state in game loops** - `interpolatedSkiersRef`, `lastSkierBroadcastRef` avoid re-render thrashing
- **useCallback dependencies matter** - when switching from state to refs, update dependency arrays
- **setState callbacks are async** - don't try to return values set inside `setState((prev) => ...)` callbacks; find the value synchronously first, then call setState

## Multiplayer Architecture (2x)
- **Server owns shared state** (level, timer, lines) - clients are views into that state
- **Interpolate network positions locally** - store display state separate from target state, lerp each frame

## Animation (1x)
- **Target refs + lerp in game loop** - pattern for smooth animations without React re-renders

