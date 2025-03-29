# Rocket Hamster Adventure - Game Design Document
## Version 0.2

---

### Game Overview
- **Genre**: Casual/Arcade 3D Platformer
- **Platform**: Web Browser (HTML5/JavaScript)
- **Core Concept**: A cute hamster pilot uses a rocket pack to fly through colorful low-poly worlds while collecting cheese and avoiding obstacles. The hamster can now spit sunflower seeds to interact with the environment!

---

### Core Gameplay Mechanics
1. **Movement**:
   - WASD/Arrow Keys for directional flight
   - Mouse look for camera control
   - Spacebar for rocket boost (limited fuel)
   - Gravity affects flight physics

2. **Objectives**:
   - Collect cheese wheels scattered throughout levels
   - Reach goal zone within time limit
   - Avoid obstacles (spikes, laser grids, etc.)

3. **Power-ups**:
   - Speed Boost (temporary flight speed increase)
   - Shield (temporary invulnerability)
   - Extra Fuel (extends boost duration)

4. **Spitting Mechanic**:
   - Left-click to spit sunflower seeds
   - Limited ammunition (refilled by collecting seed packs)
   - Seeds can destroy certain obstacles
   - Arc-based trajectory with gravity affect
   - Different seed types with varying effects

---

### Art Style & Aesthetics
- **Low-poly aesthetic** with vibrant colors
- **Character Design**:
  - Hamster: Round body, big eyes, pilot goggles
  - Rocket Pack: Retro-futuristic design with exhaust flames
  - Sunflower Seeds: Small, detailed models with particle effects when spit
- **Environment**:
  - Floating islands with simple geometric shapes
  - Day/night cycle with dynamic lighting
  - Cartoon-style particle effects for boosts/collections
- **Seed Packs**: Collectible items that refill ammunition

---

### Technical Details
- **Engine**: Three.js/Babylon.js for 3D rendering
- **Physics**: Cannon.js for collision detection
- **Spitting System**: Projectile physics with collision detection
- **Ammunition Management**: UI display and inventory system
- **Optimization**:
  - Level-of-Detail (LOD) models
  - Object pooling for particle effects
  - Web Workers for background calculations

---

### Development Roadmap
1. **Prototype Phase** (2 weeks):
   - Basic flight mechanics
   - Simple test environment
   - Hamster model with rocket animation

2. **Core Mechanics** (3 weeks):
   - Complete movement system
   - Collectible system
   - Obstacle implementation
   - Power-up mechanics

3. **Spitting System** (1 week):
   - Projectile physics implementation
   - Ammunition management
   - Seed models and animations
   - Targeting reticle UI

4. **Art & Polish** (3 weeks):
   - Full environment design
   - Sound effects and music
   - UI/UX implementation
   - Performance optimization

---

### Monetization & Distribution
- Free-to-play with optional ads
- Potential for in-game purchases (cosmetic items)
- Distribution through:
  - itch.io
  - Personal website
  - Mobile browser version

---

### Future Ideas
- Level editor for player-created content
- Multiplayer race mode
- Hamster customization options
- Procedural level generation