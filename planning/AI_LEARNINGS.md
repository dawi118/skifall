# AI Learnings

Concise directives for working on this codebase, ordered by frequency of relevance.

## Code Quality (4x)
- **Extract general utilities to lib/** - animation helpers (`lerp`, `animateToward`) go in `lib/animation.ts`, not inline in components
- **Remove comments that restate code** - constant names like `SKIER_BROADCAST_INTERVAL` are self-documenting
- **Consolidate constants** - all tunables in `lib/constants.ts` for easy adjustment
- **Prefer ternary for simple conditional assignment** - cleaner than nested if/else

## React Patterns (4x)
- **Refs for mutable state in game loops** - `interpolatedSkiersRef`, `lastSkierBroadcastRef` avoid re-render thrashing
- **useCallback dependencies matter** - when switching from state to refs, update dependency arrays
- **setState callbacks are async** - don't try to return values set inside `setState((prev) => ...)` callbacks; find the value synchronously first, then call setState
- **Don't null refs in cleanup if init is guarded** - StrictMode runs cleanup→remount, but guarded effects won't re-init. Engine refs must persist through double-mount cycles

## Multiplayer Architecture (2x)
- **Server owns shared state** (level, timer, lines) - clients are views into that state
- **Interpolate network positions locally** - store display state separate from target state, lerp each frame

## Project Structure (1x)
- **Duplicate code between party/ and src/** - `level-generator.ts` exists in both; types like `Player`, `Point`, `Line` defined separately. Future work: create shared/ folder

## Animation (1x)
- **Target refs + lerp in game loop** - pattern for smooth animations without React re-renders

