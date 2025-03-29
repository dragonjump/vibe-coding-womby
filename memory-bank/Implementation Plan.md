# Rocket Hamster Adventure - Rapid Prototype Plan (30 Minutes)

## Timeline Overview
- Setup: 5 minutes
- Core Mechanics: 15 minutes
- Polish: 10 minutes

## Phase 1: Quick Setup (5 minutes)

### Step 1: Project Setup (2 minutes)
- Create new project directory
- Quick-start with Three.js via CDN
- Create index.html with canvas
- Set up basic CSS for fullscreen

### Step 2: Basic Structure (3 minutes)
- Create main.js
- Set up Three.js scene, camera, renderer
- Add basic lighting
- Create simple game loop

## Phase 2: Core Mechanics (15 minutes)

### Step 3: Basic Character (5 minutes)
- Create simple cube/sphere for hamster placeholder
- Add basic WASD movement
- Implement simple camera follow
- Add basic collision box

### Step 4: Core Gameplay (5 minutes)
- Add basic physics (gravity and jumping)
- Implement rocket boost (spacebar)
- Add simple projectile system for seeds
- Create basic platform to stand on

### Step 5: Basic Interactions (5 minutes)
- Add collectible placeholder (floating cubes)
- Implement simple score counter
- Add basic collision detection
- Create simple UI for score/fuel

## Phase 3: Essential Polish (10 minutes)

### Step 6: Game Flow (5 minutes)
- Add start screen
- Implement game over condition
- Create simple email input form
- Add basic restart functionality

### Step 7: Final Touches (5 minutes)
- Add basic sound effects
- Implement simple particle effects
- Basic mobile touch controls
- Quick performance optimization

## Minimum Viable Features

1. Basic Movement
   - WASD/Arrow keys movement
   - Spacebar for rocket boost
   - Click/tap to shoot seeds

2. Core Mechanics
   - Simple physics
   - Basic collisions
   - Score tracking
   - Seed shooting

3. Essential UI
   - Score display
   - Fuel indicator
   - Email collection form
   - Start/Game Over screens

4. Basic Mobile Support
   - Touch areas for movement
   - Tap to shoot
   - Responsive canvas

## Technical Approach

### Quick Setup
- Use CDN links instead of npm setup
- Minimal dependencies:
  - Three.js
  - Simple physics
  - Basic sound

### Simplified Assets
- Geometric primitives for placeholders
- Basic colors instead of textures
- Simple shapes for particles

### Performance
- Minimal particle effects
- Basic collision detection
- Simple lighting setup
- No texture loading

This rapid prototype will focus on core gameplay mechanics and basic functionality. Visual polish, advanced features, and optimization will be saved for future iterations.