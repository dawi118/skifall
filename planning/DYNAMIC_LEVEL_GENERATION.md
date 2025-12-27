# Dynamic Level Generation Enhancement Plan

## Overview
This document outlines strategies to enhance the procedural level generation in Ski Fall by introducing static obstacles, moving obstacles, wind zones, and narrow passages. These features will add strategic depth and challenge to the drawing-based gameplay while maintaining the alpine theme.

**Scope**: This plan focuses exclusively on:
- Static obstacles
- Moving obstacles (alpine-themed)
- Wind zones
- Narrow passages

---

## 1. Static Obstacles

### 1.1 Overview
Static obstacles are immovable terrain features that block player paths and require strategic line drawing to navigate around.

### 1.2 Types
- **Mountain Peaks**: Large triangular or rounded rock formations
- **Rock Formations**: Smaller boulders and rock clusters
- **Trees**: Individual trees or small groves
- **Static Structures**: Buildings, huts, or other alpine structures

### 1.3 Implementation
- **Physics**: Static physics bodies (kinematic or static type)
- **Collision**: Full collision detection - contact causes crash
- **Placement**: Procedurally placed along potential routes between start and finish
- **Visual**: Alpine-themed sprites or simple geometric shapes

---

## 2. Moving Obstacles (Alpine-Themed)

### 2.1 Overview
Moving obstacles add dynamic challenge to levels. All moving obstacles are alpine-themed and must have proper collision mechanics when players collide with them.

### 2.2 Types & Specifications

#### 2.2.1 Ski Lifts (with Cables)
- **Visual**: Cable car/gondola moving along cable, visible cable line
- **Movement**: Horizontal or diagonal along cable path
- **Collision**: 
  - **Cable**: Pass-through (no collision) - players can ski under/over
  - **Lift Car**: Full collision - causes crash on contact
- **Placement**: Between start and finish, typically diagonal paths
- **Implementation**:
  - Cable: Visual line only, no physics body
  - Lift car: Kinematic physics body moving along path
  - Movement pattern: Linear back-and-forth or continuous loop
  - Speed: Configurable (e.g., 50-150 px/s)

#### 2.2.2 Mountain Peaks (Rising)
- **Visual**: Mountain peak that rises/falls vertically
- **Movement**: Vertical oscillation (up and down)
- **Collision**: Full collision - causes crash on contact
- **Placement**: Strategic positions requiring timing to pass
- **Implementation**:
  - Kinematic physics body
  - Movement: `y = baseY + amplitude * sin(time * frequency)`
  - Amplitude: 50-200px
  - Frequency: 0.5-2.0 cycles per second

#### 2.2.3 Rising Platforms
- **Visual**: Flat platform that rises from below or descends from above
- **Movement**: Vertical movement (can be used as moving terrain)
- **Collision**: 
  - **Top surface**: Can act as terrain (skier can ride on it)
  - **Sides/Bottom**: Causes crash
- **Placement**: Can create moving bridges or barriers
- **Implementation**:
  - Kinematic physics body
  - Movement pattern: Vertical oscillation or one-way movement
  - Can optionally support skier on top surface

#### 2.2.4 Islands with Trees
- **Visual**: Floating island/platform with trees on top
- **Movement**: Horizontal or circular movement
- **Collision**: 
  - **Island body**: Causes crash
  - **Trees**: Causes crash (part of island)
- **Placement**: Mid-level, creating gaps that require timing
- **Implementation**:
  - Kinematic physics body for island
  - Trees as part of island collision shape
  - Movement: Horizontal oscillation or circular path

#### 2.2.5 Slalom Flags
- **Visual**: Series of flags/gates arranged in a pattern
- **Movement**: Individual flags may sway or gates may move
- **Collision**: 
  - **Flag poles**: Causes crash
  - **Flag fabric**: Pass-through (visual only)
- **Placement**: Create slalom courses requiring weaving
- **Implementation**:
  - Static or kinematic physics bodies for poles
  - Visual flags that can animate (sway in wind)
  - Arranged in patterns (straight line, zigzag, curve)

#### 2.2.6 Floating Chalets
- **Visual**: Small alpine buildings floating or moving
- **Movement**: Horizontal, vertical, or circular movement
- **Collision**: Full collision - causes crash on contact
- **Placement**: Strategic positions as major obstacles
- **Implementation**:
  - Kinematic physics body
  - Movement patterns: Linear, circular, or figure-8
  - Size: Larger than other obstacles (100-200px wide)

### 2.3 Collision Mechanics
- **Detection**: Use existing planck.js collision system
- **Response**: On collision with moving obstacle:
  - Trigger crash (same as ground collision)
  - Use existing crash velocity threshold system
  - Ensure collision is detected for all skier body parts (head, upper body, lower body, skis)
- **Synchronization**: Moving obstacle positions synchronized via PartyKit server

---

## 3. Wind Zones

### 3.1 Overview
Wind zones apply lateral forces to the skier, affecting trajectory and requiring compensation in line drawing.

### 3.2 Implementation Details

#### 3.2.1 Zone Definition
- **Shape**: Vertical columns or horizontal bands
- **Size**: 
  - Vertical columns: 100-300px wide, full height or partial
  - Horizontal bands: Full width, 100-200px tall
- **Placement**: Procedurally placed between start and finish
- **Density**: 2-5 wind zones per level (depending on difficulty)

#### 3.2.2 Wind Properties
- **Direction**: Left, right, or variable
- **Strength**: Configurable force magnitude (e.g., 0.5-2.0x gravity)
- **Visualization**: 
  - Particle effects showing wind direction
  - Directional arrows
  - Subtle screen effect (optional)

#### 3.2.3 Physics Integration
- **Force Application**: Apply lateral force to skier when inside zone
- **Detection**: Check if skier position is within wind zone bounds
- **Calculation**: 
  ```typescript
  if (skierInWindZone) {
    const windForce = windDirection * windStrength;
    skierBody.applyForce(windForce, 0); // lateral force only
  }
  ```
- **Timing**: Apply force every physics step while skier is in zone

#### 3.2.4 Procedural Generation
- **Placement Algorithm**:
  1. Divide level into vertical or horizontal sections
  2. Randomly select sections for wind zones
  3. Ensure zones don't overlap excessively
  4. Vary wind direction (left/right) randomly
  5. Adjust strength based on difficulty

---

## 4. Narrow Passages

### 4.1 Overview
Narrow passages are constricted routes through obstacles that require precise line placement. The minimum passage width is **50px** to ensure a skier (approximately 20-30px wide) can pass through.

### 4.2 Implementation Details

#### 4.2.1 Passage Definition
- **Width**: Minimum 50px, maximum 150px (for variety)
- **Height**: Variable, typically 200-500px tall
- **Placement**: Between obstacle clusters or as routes through larger obstacles
- **Visual**: Clear markers showing safe passage boundaries

#### 4.2.2 Generation Strategy
1. **Identify Obstacle Clusters**: Group nearby obstacles
2. **Find Gaps**: Calculate gaps between obstacles
3. **Validate Width**: Ensure gap is at least 50px wide
4. **Create Passage**: Mark valid gaps as narrow passages
5. **Add Visual Markers**: Render boundaries clearly

#### 4.2.3 Passage Types
- **Between Static Obstacles**: Gap between two static obstacles
- **Through Moving Obstacles**: Gap that appears/disappears as obstacles move
- **Terrain Gates**: Created by terrain walls/barriers
- **Slalom Courses**: Series of narrow passages created by slalom flags

#### 4.2.4 Collision Boundaries
- **Walls**: Static physics bodies on either side of passage
- **Collision**: Contact with walls causes crash
- **Visual**: Clear visual indicators (colored lines, markers, or subtle background)

#### 4.2.5 Procedural Algorithm
```typescript
function generateNarrowPassages(obstacles: Obstacle[], minWidth: number = 50): Passage[] {
  const passages: Passage[] = [];
  
  // Sort obstacles by position
  const sortedObstacles = sortObstacles(obstacles);
  
  // Find gaps between obstacles
  for (let i = 0; i < sortedObstacles.length - 1; i++) {
    const gap = calculateGap(sortedObstacles[i], sortedObstacles[i + 1]);
    
    if (gap.width >= minWidth && gap.height >= 100) {
      passages.push({
        id: generateId(),
        position: gap.center,
        width: gap.width,
        height: gap.height,
        bounds: gap.bounds
      });
    }
  }
  
  return passages;
}
```

---

## 5. Procedural Level Generation Strategy

### 5.1 Generation Pipeline

#### Step 1: Generate Base Level
- Generate start and finish points (existing system)
- Calculate primary route between them

#### Step 2: Place Static Obstacles
- Identify potential obstacle placement zones
- Place static obstacles along route (not blocking completely)
- Ensure at least one viable path remains

#### Step 3: Generate Narrow Passages
- Analyze gaps between static obstacles
- Validate passages meet 50px minimum width
- Mark valid passages

#### Step 4: Place Moving Obstacles
- Identify strategic positions for moving obstacles
- Ensure movement patterns don't permanently block all paths
- Place different types based on level theme

#### Step 5: Add Wind Zones
- Divide level into sections
- Place wind zones procedurally
- Vary direction and strength

#### Step 6: Validate Level
- Ensure at least one viable path exists
- Verify all passages are navigable (≥50px)
- Check obstacle density is appropriate

### 5.2 Placement Constraints

#### Obstacle Placement Rules
- **Minimum Distance**: Obstacles must be at least 100px from start/finish
- **Path Validation**: At least one 50px+ wide path must exist from start to finish
- **Density Control**: Limit total obstacles based on level size
  - Small level: 3-5 obstacles
  - Medium level: 5-8 obstacles
  - Large level: 8-12 obstacles

#### Moving Obstacle Rules
- **Movement Bounds**: Moving obstacles must stay within level bounds
- **Path Availability**: Movement pattern must allow passage at some point
- **Synchronization**: All players see same movement (server-authoritative)

#### Wind Zone Rules
- **Non-Overlapping**: Wind zones should not overlap (or overlap minimally)
- **Distribution**: Spread wind zones across level (not all clustered)
- **Balance**: Mix left and right wind directions

### 5.3 Difficulty Scaling

#### Easy
- Fewer obstacles (3-5 total)
- Wider passages (80-150px)
- Slower moving obstacles
- Weaker wind zones
- More predictable movement patterns

#### Medium
- Moderate obstacles (5-8 total)
- Standard passages (50-100px)
- Moderate moving obstacle speed
- Standard wind strength
- Varied movement patterns

#### Hard
- More obstacles (8-12 total)
- Narrower passages (50-80px)
- Faster moving obstacles
- Stronger wind zones
- Complex movement patterns

---

## 6. Data Structures

### 6.1 Extended Level Interface
```typescript
interface Level {
  id: string;
  start: Point;
  finish: Point;
  staticObstacles: StaticObstacle[];
  movingObstacles: MovingObstacle[];
  windZones: WindZone[];
  narrowPassages: NarrowPassage[];
  difficulty: 'easy' | 'medium' | 'hard';
}

interface StaticObstacle {
  id: string;
  type: 'mountain-peak' | 'rock-formation' | 'tree' | 'structure';
  position: Point;
  bounds: { width: number; height: number };
  shape: 'rectangle' | 'circle' | 'polygon';
  vertices?: Point[]; // for polygon shapes
}

interface MovingObstacle {
  id: string;
  type: 'ski-lift' | 'rising-peak' | 'platform' | 'island' | 'slalom-flags' | 'chalet';
  basePosition: Point;
  bounds: { width: number; height: number };
  movement: MovementPattern;
  collisionType: 'full' | 'pass-through-cable'; // for ski lifts
  cablePath?: { start: Point; end: Point }; // for ski lifts
}

interface MovementPattern {
  type: 'linear' | 'circular' | 'oscillate' | 'figure8';
  speed: number; // px/s
  amplitude?: number; // for oscillate
  frequency?: number; // for oscillate
  radius?: number; // for circular
  direction: 'horizontal' | 'vertical' | 'diagonal';
  path?: Point[]; // for custom paths
}

interface WindZone {
  id: string;
  position: Point;
  bounds: { width: number; height: number };
  direction: 'left' | 'right';
  strength: number; // force multiplier (0.5-2.0)
  shape: 'vertical-column' | 'horizontal-band';
}

interface NarrowPassage {
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
```

### 6.2 Physics Body Mapping
```typescript
interface ObstaclePhysicsBody {
  obstacleId: string;
  body: planck.Body;
  fixture: planck.Fixture;
  isMoving: boolean;
  movementUpdate?: (deltaTime: number) => void;
}
```

---

## 7. Physics Integration

### 7.1 Static Obstacles
- **Body Type**: Static (immovable)
- **Collision**: Full collision with all skier body parts
- **Category**: Separate collision category for obstacles
- **Implementation**: Add fixtures to physics world during level initialization

### 7.2 Moving Obstacles
- **Body Type**: Kinematic (moved programmatically, not affected by forces)
- **Collision**: Full collision detection
- **Movement Update**: Update position every physics step
- **Synchronization**: Server calculates positions, broadcasts to clients
- **Implementation**:
  ```typescript
  function updateMovingObstacle(obstacle: MovingObstacle, deltaTime: number) {
    const pattern = obstacle.movement;
    let newPosition: Point;
    
    switch (pattern.type) {
      case 'linear':
        newPosition = calculateLinearMovement(obstacle.basePosition, pattern, deltaTime);
        break;
      case 'oscillate':
        newPosition = calculateOscillation(obstacle.basePosition, pattern, deltaTime);
        break;
      // ... other patterns
    }
    
    obstacle.body.setPosition(toPhysics(newPosition));
  }
  ```

### 7.3 Wind Zones
- **Force Application**: Applied during physics step
- **Detection**: Check skier position against wind zone bounds
- **Calculation**: Apply lateral force based on wind direction and strength
- **Implementation**:
  ```typescript
  function applyWindForces(engine: PhysicsEngine, windZones: WindZone[]) {
    const skierPos = getSkierPosition(engine);
    
    for (const zone of windZones) {
      if (isPointInBounds(skierPos, zone.bounds)) {
        const forceX = zone.direction === 'left' ? -zone.strength : zone.strength;
        engine.skis.applyForce(Vec2(forceX, 0), skierPos);
      }
    }
  }
  ```

### 7.4 Narrow Passages
- **Collision Boundaries**: Static walls on either side
- **Validation**: Ensure passage width ≥ 50px
- **Visual Markers**: Render boundaries clearly
- **Implementation**: Create static physics bodies for passage walls

---

## 8. Multiplayer Synchronization

### 8.1 Moving Obstacle Synchronization
- **Server Authority**: Server calculates all moving obstacle positions
- **Broadcast Frequency**: Update positions at ~15-30Hz (same as skier positions)
- **Message Format**:
  ```typescript
  {
    type: 'obstacle-position',
    obstacleId: string,
    position: Point,
    angle?: number
  }
  ```
- **Client Interpolation**: Smooth movement between server updates

### 8.2 Wind Zone Synchronization
- **Static Data**: Wind zones are part of level generation (shared)
- **No Runtime Updates**: Wind zones don't change during gameplay
- **Initialization**: Sent with level data to all clients

### 8.3 Collision Event Broadcasting
- **Crash Events**: Broadcast when player collides with obstacle
- **Consistency**: Ensure all players see same collision results

---

## 9. Visual Rendering

### 9.1 Static Obstacles
- **Sprites**: Alpine-themed sprites for different obstacle types
- **Fallback**: Simple geometric shapes with colors
- **Layering**: Render behind lines, in front of background

### 9.2 Moving Obstacles
- **Animation**: Smooth movement interpolation
- **Cable Rendering**: For ski lifts, render cable line (visual only)
- **State Indicators**: Show movement direction/pattern (optional)

### 9.3 Wind Zones
- **Particle Effects**: Show wind direction with particles
- **Directional Arrows**: Visual indicators showing wind direction
- **Zone Highlighting**: Subtle background effect (optional)
- **Opacity**: Semi-transparent so lines are visible

### 9.4 Narrow Passages
- **Boundary Markers**: Clear visual boundaries (colored lines or markers)
- **Safe Zone Highlighting**: Optional subtle background color
- **Width Indicators**: Visual feedback showing passage width

---

## 10. Implementation Phases

### Phase 1: Foundation
1. ✅ Extend Level interface with obstacle/wind zone/passage data
2. ✅ Implement static obstacle generation and placement
3. ✅ Add static obstacle physics bodies to physics engine
4. ✅ Implement basic rendering for static obstacles
5. ✅ Add collision detection for static obstacles

### Phase 2: Moving Obstacles
1. ✅ Implement moving obstacle data structures
2. ✅ Add kinematic physics bodies for moving obstacles
3. ✅ Implement movement pattern algorithms (linear, oscillate, circular)
4. ✅ Add server-side movement calculation
5. ✅ Implement client-side interpolation
6. ✅ Add collision detection for moving obstacles
7. ✅ Implement specific obstacle types (lifts, peaks, platforms, etc.)

### Phase 3: Wind Zones
1. ✅ Implement wind zone generation algorithm
2. ✅ Add wind zone bounds checking
3. ✅ Integrate wind force application in physics step
4. ✅ Add visual rendering (particles, arrows)
5. ✅ Test wind zone effects on gameplay

### Phase 4: Narrow Passages
1. ✅ Implement passage detection algorithm
2. ✅ Validate minimum 50px width requirement
3. ✅ Generate passage boundaries (walls)
4. ✅ Add visual markers for passages
5. ✅ Test passage navigation

### Phase 5: Integration & Polish
1. ✅ Integrate all systems in level generator
2. ✅ Add difficulty scaling
3. ✅ Balance obstacle density and placement
4. ✅ Optimize performance
5. ✅ Add visual polish and effects
6. ✅ Playtesting and iteration

---

## 11. Testing Considerations

### 11.1 Collision Testing
- Verify all moving obstacles trigger crash on collision
- Test ski lift cables allow pass-through
- Ensure narrow passages are navigable (≥50px)
- Verify collision works for all skier body parts

### 11.2 Movement Testing
- Verify moving obstacles stay within level bounds
- Test movement patterns don't permanently block paths
- Ensure smooth interpolation on clients
- Test synchronization across multiplayer

### 11.3 Wind Zone Testing
- Verify wind forces apply correctly
- Test wind direction affects skier trajectory
- Ensure wind zones don't cause unexpected crashes
- Test visual indicators are clear

### 11.4 Passage Testing
- Verify all passages are at least 50px wide
- Test passages are navigable with skier size
- Ensure visual markers are accurate
- Test dynamic passages (with moving obstacles)

### 11.5 Level Generation Testing
- Verify at least one viable path always exists
- Test obstacle density is appropriate
- Ensure variety in generated levels
- Test difficulty scaling works correctly

---

## 12. Performance Considerations

### 12.1 Obstacle Limits
- **Static Obstacles**: 5-15 per level
- **Moving Obstacles**: 3-8 per level
- **Wind Zones**: 2-5 per level
- **Narrow Passages**: 2-6 per level

### 12.2 Optimization Strategies
- Use spatial partitioning for collision detection
- Batch render obstacles of same type
- Limit particle effects for wind zones
- Cache obstacle collision shapes
- Update moving obstacles at lower frequency if needed (with interpolation)

### 12.3 Multiplayer Optimization
- Broadcast moving obstacle positions at reasonable frequency (15-30Hz)
- Use delta compression for position updates
- Only broadcast obstacles visible to players

---

## Conclusion

This focused plan provides a clear roadmap for implementing static obstacles, moving obstacles (alpine-themed), wind zones, and narrow passages into Ski Fall's procedural level generation. The key implementation priorities are:

1. **Proper Collision Mechanics**: Ensure all obstacles (especially moving ones) properly detect and respond to player collisions
2. **Minimum Passage Width**: Strictly enforce 50px minimum for navigable passages
3. **Alpine Theme**: All moving obstacles should fit the alpine skiing theme
4. **Procedural Generation**: Create algorithms that ensure viable paths while adding challenge
5. **Multiplayer Sync**: Keep all dynamic elements synchronized across players

The phased approach allows for incremental implementation and testing, ensuring each feature works correctly before moving to the next.
