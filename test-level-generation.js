// Quick test script to verify level generation works
// Run with: node test-level-generation.js

// This is a simple Node.js test - in a real scenario, you'd test in the browser
console.log('Testing Level Generation...\n');

// Test that the level structure is correct
const testLevelStructure = (level) => {
  const errors = [];
  
  if (!level.id) errors.push('Missing level.id');
  if (!level.start || !level.start.x || !level.start.y) errors.push('Missing or invalid level.start');
  if (!level.finish || !level.finish.x || !level.finish.y) errors.push('Missing or invalid level.finish');
  if (!Array.isArray(level.staticObstacles)) errors.push('Missing or invalid level.staticObstacles');
  if (!Array.isArray(level.movingObstacles)) errors.push('Missing or invalid level.movingObstacles');
  if (!Array.isArray(level.windZones)) errors.push('Missing or invalid level.windZones');
  if (!Array.isArray(level.narrowPassages)) errors.push('Missing or invalid level.narrowPassages');
  if (!['easy', 'medium', 'hard'].includes(level.difficulty)) errors.push('Invalid difficulty');
  
  // Validate static obstacles
  level.staticObstacles.forEach((obs, i) => {
    if (!obs.id) errors.push(`Static obstacle ${i} missing id`);
    if (!obs.type || !['mountain-peak', 'rock-formation', 'tree', 'structure'].includes(obs.type)) {
      errors.push(`Static obstacle ${i} has invalid type`);
    }
    if (!obs.position || !obs.bounds) errors.push(`Static obstacle ${i} missing position or bounds`);
  });
  
  // Validate moving obstacles
  level.movingObstacles.forEach((obs, i) => {
    if (!obs.id) errors.push(`Moving obstacle ${i} missing id`);
    if (!obs.type || !['ski-lift', 'rising-peak', 'platform', 'island', 'slalom-flags', 'chalet'].includes(obs.type)) {
      errors.push(`Moving obstacle ${i} has invalid type`);
    }
    if (!obs.basePosition || !obs.movement) errors.push(`Moving obstacle ${i} missing basePosition or movement`);
  });
  
  // Validate wind zones
  level.windZones.forEach((zone, i) => {
    if (!zone.id) errors.push(`Wind zone ${i} missing id`);
    if (!zone.direction || !['left', 'right'].includes(zone.direction)) {
      errors.push(`Wind zone ${i} has invalid direction`);
    }
    if (typeof zone.strength !== 'number') errors.push(`Wind zone ${i} has invalid strength`);
  });
  
  // Validate narrow passages
  level.narrowPassages.forEach((passage, i) => {
    if (!passage.id) errors.push(`Narrow passage ${i} missing id`);
    if (passage.width < 50) errors.push(`Narrow passage ${i} width is less than 50px minimum`);
    if (!passage.bounds) errors.push(`Narrow passage ${i} missing bounds`);
  });
  
  return errors;
};

console.log('✓ Level generation test script created');
console.log('\nTo test in the browser:');
console.log('1. Run: npm run dev');
console.log('2. Run: npm run dev:party (in another terminal)');
console.log('3. Open http://localhost:5173');
console.log('4. Create or join a game');
console.log('5. Verify that levels contain:');
console.log('   - Static obstacles (colored rectangles/circles)');
console.log('   - Moving obstacles (updating positions)');
console.log('   - Wind zones (colored areas with arrows)');
console.log('   - Narrow passages (green highlighted areas)');
console.log('\nExpected behavior:');
console.log('- Obstacles should block the skier (cause crashes on collision)');
console.log('- Wind zones should push the skier left or right');
console.log('- Moving obstacles should move in their patterns');
console.log('- All obstacles should be visible and render correctly');

