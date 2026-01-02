# Dynamic Level Generation Enhancement Plan

## Overview
This document outlines strategies to enhance the procedural level generation in Ski Fall by introducing static obstacles, moving obstacles, wind zones, and narrow passages. These features will add strategic depth and challenge to the drawing-based gameplay while maintaining the alpine theme.

**Scope**: This plan focuses exclusively on:
- Static obstacles
- Wind zones
- Narrow passages

---

## 1. Static Obstacles

### 1.1 Overview
Static obstacles are immovable terrain features that block player paths and require strategic line drawing to navigate around. Each is designed with pixelart and is located on a floating island.

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

## 2. Wind Zones

### 2.1 Overview
Wind zones apply lateral forces to the skier, affecting trajectory and requiring compensation in line drawing. Visualised by wisps of air and moving snow pixels

### 2.2 Implementation Details

#### 2.2.1 Zone Definition
- **Shape**: Vertical columns or horizontal bands
- **Size**: 
  - Vertical columns: 100-300px wide, full height or partial
  - Horizontal bands: Full width, 100-200px tall
- **Placement**: Procedurally placed between start and finish
- **Density**: 1-2 wind zones per level

#### 2.2.2 Wind Properties
- **Direction**: Left, or right
- **Strength**: Configurable force magnitude (e.g., 0.5-2.0x gravity)
- **Visualization**: 
  - Particle effects showing wind direction
  - Directional arrows
  - Subtle screen effect (optional)

#### 2.2.3 Physics Integration
- **Force Application**: Apply a lateral force to skier when inside zone
- **Detection**: Check if skier position is within wind zone bounds
- **Calculation**: 
  ```typescript
  if (skierInWindZone) {
    const windForce = windDirection * windStrength;
    skierBody.applyForce(windForce, 0); // lateral force only
  }
  ```
- **Timing**: Apply force every physics step while skier is in zone

#### 2.2.4 Procedural Generation
- **Placement Algorithm**:
  1. Divide level into vertical or horizontal sections
  2. Randomly select sections for wind zones
  3. Ensure zones don't overlap, and are spaced out slightly frome each other
  4. Vary wind direction (left/right) randomly
  5. Adjust strength based on difficulty

```

---

## 3. Procedural Level Generation Strategy

### 3.1 Generation Pipeline

#### Step 1: Generate Base Level
- Generate start and finish points (existing system)
- Calculate primary route between them

#### Step 2: Place Static Obstacles
- Identify potential obstacle placement zones
- Place static obstacles along route (not blocking completely)
- Ensure at least one viable path remains

#### Step 3: Add Wind Zones
- Divide level into sections
- Place wind zones procedurally
- Vary direction and strength

#### Step 4: Validate Level
- Ensure at least one viable path exists
- Verify all passages are navigable (≥50px)
- Check obstacle density is appropriate

### 3.2 Placement Constraints

#### Obstacle Placement Rules
- **Minimum Distance**: Obstacles must be at least 100px from start/finish
- **Path Validation**: At least one 50px+ wide path must exist from start to finish
- **Density Control**: Limit total obstacles based on level size
  - Small level: 0-2 obstacles
  - Medium level: 3-5 obstacles
  - Large level: 6-7 obstacles

#### Wind Zone Rules
- **Non-Overlapping**: Wind zones should not overlap (or overlap minimally)
- **Distribution**: Spread wind zones across level (not all clustered)
- **Balance**: Mix left and right wind directions

---

## 4. Data Structures

### 4.1 Extended Level Interface
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

interface WindZone {
  id: string;
  position: Point;
  bounds: { width: number; height: number };
  direction: 'left' | 'right';
  strength: number; // force multiplier (0.5-2.0)
  shape: 'vertical-column' | 'horizontal-band';
}

```

### 4.2 Physics Body Mapping
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

## 5. Physics Integration

### 5.1 Static Obstacles
- **Body Type**: Static (immovable)
- **Collision**: Full collision with all skier body parts
- **Category**: Separate collision category for obstacles
- **Implementation**: Add fixtures to physics world during level initialization

  ```

### 5.3 Wind Zones
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
---

## 6. Multiplayer Synchronization

### 6.1 Wind Zone Synchronization
- **Static Data**: Wind zones are part of level generation (shared)
- **No Runtime Updates**: Wind zones don't change during gameplay
- **Initialization**: Sent with level data to all clients

### 6.2 Collision Event Broadcasting
- **Crash Events**: Broadcast when player collides with obstacle
- **Consistency**: Ensure all players see same collision results

---

## 7. Visual Rendering

### 7.1 Static Obstacles
- **Sprites**: Alpine-themed sprites for different obstacle types
- **Fallback**: Simple geometric shapes with colors
- **Layering**: Render behind lines, in front of background

### 7.2 Wind Zones
- **Particle Effects**: Show wind direction with particles
- **Directional Arrows**: Visual indicators showing wind direction
- **Zone Highlighting**: Subtle background effect (optional)
- **Opacity**: Semi-transparent so lines are visible

---

## 8. Implementation Phases

### Phase 1: Foundation
1. ✅ Extend Level interface with obstacle/wind zone/passage data
2. ✅ Implement static obstacle generation and placement
3. ✅ Add static obstacle physics bodies to physics engine
4. ✅ Implement basic rendering for static obstacles
5. ✅ Add collision detection for static obstacles

### Phase 2: Wind Zones
1. ✅ Implement wind zone generation algorithm
2. ✅ Add wind zone bounds checking
3. ✅ Integrate wind force application in physics step
4. ✅ Add visual rendering (particles, arrows)
5. ✅ Test wind zone effects on gameplay

### Phase 3: Integration & Polish
1. ✅ Integrate all systems in level generator
2. ✅ Add difficulty scaling
3. ✅ Balance obstacle density and placement
4. ✅ Optimize performance
5. ✅ Add visual polish and effects
6. ✅ Playtesting and iteration

---

## 9. Testing Considerations

### 9.1 Collision Testing
- Verify all moving obstacles trigger crash on collision
- Test ski lift cables allow pass-through
- Ensure narrow passages are navigable (≥50px)
- Verify collision works for all skier body parts

### 9.2 Wind Zone Testing
- Verify wind forces apply correctly
- Test wind direction affects skier trajectory
- Ensure wind zones don't cause unexpected crashes
- Test visual indicators are clear


### 9.3 Level Generation Testing
- Verify at least one viable path always exists
- Test obstacle density is appropriate
- Ensure variety in generated levels
- Test difficulty scaling works correctly

---

## 10. Performance Considerations

### 10.1 Obstacle Limits
- **Static Obstacles**: 0-8 per level
- **Wind Zones**: 0-2 per level

### 10.2 Optimization Strategies
- Use spatial partitioning for collision detection
- Batch render obstacles of same type
- Limit particle effects for wind zones
- Cache obstacle collision shapes

### 10.3 Multiplayer Optimization
- Use delta compression for position updates
- Only broadcast obstacles visible to players

---

## Conclusion

This focused plan provides a clear roadmap for implementing static obstacles (alpine-themed), and wind zones, into Ski Fall's procedural level generation. The key implementation priorities are:

1. **Proper Collision Mechanics**: Ensure all obstacles properly detect and respond to player collisions
3. **Alpine Theme**: All moving obstacles should fit the alpine skiing theme
4. **Procedural Generation**: Create algorithms that ensure viable paths while adding challenge
5. **Multiplayer Sync**: Keep all dynamic elements synchronized across players

The phased approach allows for incremental implementation and testing, ensuring each feature works correctly before moving to the next.
