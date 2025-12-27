# Testing Guide for Dynamic Level Generation

## Build Status
✅ **All TypeScript compilation errors fixed**
✅ **Build successful** - `npm run build` completes without errors

## Quick Start Testing

### 1. Start Development Servers

Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (PartyKit Server):
```bash
npm run dev:party
```

### 2. Open Browser
Navigate to: http://localhost:5173

## Feature Testing Checklist

### Static Obstacles
- [ ] **Visual**: Static obstacles appear as colored rectangles/circles
  - Mountain peaks: Brown (#8B7355)
  - Rock formations: Dark brown (#6B5B4F)
  - Trees: Green (#2D5016)
  - Structures: Brown (#A0522D)
- [ ] **Collision**: Skier crashes when hitting static obstacles
- [ ] **Placement**: Obstacles are placed between start and finish
- [ ] **Variety**: Different obstacle types appear across levels

### Moving Obstacles
- [ ] **Visual**: Moving obstacles are visible and colored appropriately
  - Ski lifts: Red (#FF6B6B) with cable lines
  - Rising peaks: Brown (#8B7355)
  - Platforms: Gray (#9B9B9B)
  - Islands: Green (#5A7A3A)
  - Slalom flags: Gold (#FFD700)
  - Chalets: Brown (#A0522D)
- [ ] **Movement**: Obstacles move according to their patterns
  - Linear: Back and forth along path
  - Oscillate: Up/down or left/right oscillation
  - Circular: Circular motion
- [ ] **Synchronization**: All players see obstacles in same positions
- [ ] **Collision**: Skier crashes when hitting moving obstacles
- [ ] **Ski Lift Cables**: Cables are visual only (pass-through), lift cars cause crashes

### Wind Zones
- [ ] **Visual**: Wind zones appear as semi-transparent colored areas
  - Left wind: Blue (#4A90E2)
  - Right wind: Red (#E24A4A)
- [ ] **Arrows**: Directional arrows show wind direction
- [ ] **Effect**: Skier is pushed left/right when in wind zone
- [ ] **Strength**: Wind effect is noticeable but not overpowering

### Narrow Passages
- [ ] **Visual**: Passages appear as green highlighted areas with dashed borders
- [ ] **Width**: All passages are at least 50px wide
- [ ] **Navigation**: Skier can pass through passages
- [ ] **Placement**: Passages appear between obstacles

### Level Generation
- [ ] **Difficulty**: Levels generate with appropriate difficulty
  - Easy: 3-5 static obstacles, 1-2 moving obstacles, 2 wind zones
  - Medium: 5-8 static obstacles, 2-3 moving obstacles, 3 wind zones
  - Hard: 8-12 static obstacles, 3-4 moving obstacles, 5 wind zones
- [ ] **Variety**: Each level is different
- [ ] **Viability**: At least one navigable path exists from start to finish
- [ ] **Spacing**: Obstacles maintain minimum distance from start/finish (100-150px)

### Multiplayer Synchronization
- [ ] **Moving Obstacles**: All players see same obstacle positions
- [ ] **Updates**: Obstacle positions update smoothly (~15Hz)
- [ ] **Consistency**: No desync between players

### Physics Integration
- [ ] **Collision Detection**: All obstacle types trigger crashes
- [ ] **Wind Forces**: Wind affects skier trajectory correctly
- [ ] **Performance**: No noticeable lag with obstacles present

## Known Issues to Watch For

1. **Obstacle Overlap**: Ensure obstacles don't spawn on top of each other
2. **Path Blocking**: Verify at least one path always exists
3. **Performance**: Check FPS with maximum obstacles
4. **Synchronization**: Verify moving obstacles stay in sync across clients

## Debugging Tips

### Check Console
- Open browser DevTools (F12)
- Check for any errors in Console tab
- Verify network requests to PartyKit server

### Visual Debugging
- Obstacles should be clearly visible
- Wind zones should have visible boundaries
- Passages should be highlighted

### Physics Debugging
- If skier passes through obstacles, check collision categories
- If wind doesn't work, verify wind zone bounds checking
- If moving obstacles don't move, check server synchronization

## Test Scenarios

### Scenario 1: Basic Obstacle Avoidance
1. Start a game
2. Draw a line that goes around static obstacles
3. Start the skier
4. Verify skier follows line and avoids obstacles

### Scenario 2: Moving Obstacle Timing
1. Start a game with moving obstacles
2. Observe obstacle movement pattern
3. Draw a line that times passage through moving obstacles
4. Verify timing works correctly

### Scenario 3: Wind Zone Compensation
1. Start a game with wind zones
2. Draw a line that accounts for wind push
3. Start the skier
4. Verify skier trajectory is affected by wind

### Scenario 4: Narrow Passage Navigation
1. Start a game with narrow passages
2. Draw a line through a narrow passage
3. Verify skier can navigate through (≥50px width)

### Scenario 5: Multiplayer Sync
1. Have 2+ players join same game
2. Observe moving obstacles
3. Verify all players see same positions
4. Verify collisions are consistent

## Performance Benchmarks

Expected performance with full feature set:
- **FPS**: 60fps (or stable 30fps minimum)
- **Obstacle Count**: 5-15 static, 1-4 moving per level
- **Wind Zones**: 2-5 per level
- **Network Updates**: ~15Hz for moving obstacles

## Reporting Issues

If you find issues, note:
1. Browser and version
2. Number of players
3. Difficulty level
4. Specific obstacle/wind zone behavior
5. Console errors (if any)
6. Steps to reproduce

