# Obstacle Sprites

Upload your pixelart images to this directory. The following sprites are needed:

## Required Sprites

1. **floating-island.png** - Base platform that all obstacles sit on top of
   - Should be wider than the obstacle (about 1.3x width)
   - Height should be about 0.4x the obstacle height
   - Positioned below obstacles

2. **mountain-peak.png** - Mountain peak obstacle sprite
   - Used for obstacles of type 'mountain-peak'
   - Typical size: 80-150px width, 80-150px height

3. **rock-formation.png** - Rock formation obstacle sprite
   - Used for obstacles of type 'rock-formation'
   - Typical size: 40-80px width, 40-80px height

4. **tree.png** - Tree obstacle sprite
   - Used for obstacles of type 'tree'
   - Typical size: 30-50px width, 50-80px height
   - Note: Trees use circular collision shape

5. **house.png** - House/structure obstacle sprite
   - Used for obstacles of type 'structure'
   - Typical size: 60-100px width, 60-100px height

## Sprite Requirements

- Format: PNG with transparency
- Style: Pixelart to match game aesthetic
- All obstacles should be designed to sit on top of floating islands
- Sprites will be scaled to match obstacle bounds

## Implementation Note

Once sprites are uploaded, update `src/lib/renderer.ts` in the `drawStaticObstacle` function to load and draw the actual images instead of placeholders.

