# Project Learnings

## Week of Dec 23, 2025

### PartyKit Multiplayer Architecture
- **Server-authoritative state**: The PartyKit server (`party/index.ts`) owns shared game state - level, timer, player lines. Clients request changes, server broadcasts updates.
- **Message types follow a pattern**: `welcome`, `player-joined`, `player-left`, `level-update`, `line-add`, `line-remove`, `skier-position`. Each has a corresponding handler on both client and server.
- **Connection lifecycle**: `onConnect` assigns identity (name, color, avatar) and sends initial state. `onClose` cleans up player data including their lines.

### React + Game Loop Integration
- **Refs for game loop state**: Animation state that changes every frame (like `interpolatedSkiersRef`) should be in refs, not React state, to avoid re-render thrashing.
- **Target-based animation**: Pattern of `scaleTarget.current = 0` then lerping toward it in the game loop provides smooth animations.
- **Timer synchronization**: `timer.syncToServerTime(roundStartTime)` calculates elapsed time from server timestamp to align late-joining players.

### Ghost Skier Interpolation
- **Network latency hiding**: Store both the raw network state and an interpolated display state. Each frame, lerp the display state toward the target.
- **~15Hz broadcast, 60fps render**: Position updates sent at ~66ms intervals, but interpolation makes movement appear smooth at 60fps.
- **Cleanup on state change**: Ghost skiers removed from interpolation map when player resets (runState='idle') or new level starts.

### Code Organization
- **`lib/` for pure functions**: `renderer.ts`, `skier.ts`, `physics.ts`, `animation.ts` - no React dependencies
- **`hooks/` for stateful logic**: `useLocalPlayer`, `useCamera`, `useTimer`, `usePartySocket`
- **`components/` for UI**: GameCanvas is the main game, others are overlays (Timer, Toolbar, RoundComplete)
- **`lib/constants.ts`**: All tunables (animation speeds, game durations, colors) centralized here

### React Gotcha: Async setState
- **Bug pattern**: Trying to return a value set inside a `setState` callback won't work because the callback runs asynchronously
- **Fix**: Find the value synchronously first, then call `setState` to update, then return the value
- **Example**: `eraseLine()` in `useDrawing` - find the line to erase before calling `setLines()`

### React Gotcha: StrictMode and Effect Cleanup
- **What StrictMode does**: In development, React mounts → runs effects → unmounts → remounts → runs effects again
- **The trap**: If effect cleanup nulls a ref (`engineRef.current = null`) but the init effect is guarded (`if (alreadyDone) return`), the remount won't re-init
- **Bug pattern**: Physics engine created in init effect, nulled in cleanup, not recreated on remount because guard prevents re-run
- **Fix**: Don't null refs in cleanup when the resource will be needed after StrictMode double-mount. Let GC handle it on true unmount.

### Deployment Architecture
- **Netlify + PartyKit**: Frontend on Netlify, multiplayer server on PartyKit
- **Environment-based routing**: `VITE_PARTYKIT_HOST` env var tells frontend which PartyKit server to connect to
- **Branch previews**: Both services support preview deployments - Netlify auto-deploys branches, GitHub Actions deploys PartyKit with branch-specific names
- **Avoid double-broadcast**: When server transitions game phases (all ready → start), don't broadcast intermediate state before calling `startRound()` - it causes race conditions on clients

