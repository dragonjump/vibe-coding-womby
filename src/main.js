import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TerrainManager } from './components/terrain.js';
import { CloudManager } from './components/clouds.js';
import { createBookCollectible, createFactPopup } from './components/collectibles.js';

// ... existing code ...

// After scene initialization
function initScene() {
    scene = new THREE.Scene();
    
    // Enable tone mapping and adjust exposure for better visibility
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    const currentLevel = levelManager.getCurrentLevel();
    
    // Set background and fog
    scene.background = new THREE.Color(currentLevel.environment.skyColor);
    if (currentLevel.environment.fogDensity > 0) {
        scene.fog = new THREE.FogExp2(currentLevel.environment.skyColor, currentLevel.environment.fogDensity);
    }
    
    // Initialize terrain and other components
    terrainManager = new TerrainManager(scene);
    cloudManager = new CloudManager(scene);
    
    // Initialize player/hamster
    initializePlayer();
    
    // Add book collectibles after player is initialized
    addBookCollectibles();
    
    // For level 3, ensure proper rendering of white mountains
    if (currentLevel.id === 3) {
        renderer.toneMappingExposure = 2.0;
        scene.fog.density = 0.008;
    }
}

// Make books more visible
function addBookCollectibles() {
    const numBooks = 5;
    const startRadius = 5;
    
    // Get player starting position
    const playerStartX = hamster.position.x;
    const playerStartZ = hamster.position.z;
    
    for (let i = 0; i < numBooks; i++) {
        const angle = (i / numBooks) * Math.PI * 2;
        
        // Calculate position in a smaller circle around the player
        const x = playerStartX + Math.cos(angle) * startRadius;
        const z = playerStartZ + Math.sin(angle) * startRadius;
        const y = terrainManager.getHeight(x, z) + 2; // Increased height to 2 units
        
        const book = createBookCollectible(x, y, z);
        
        // Make books larger and more visible
        book.scale.set(1.5, 1.5, 1.5);
        
        // Add glow effect
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            transparent: true,
            opacity: 0.3
        });
        const glowGeometry = new THREE.BoxGeometry(1.2, 1.6, 0.3);
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        book.add(glow);
        
        // Add debug helper
        const helper = new THREE.AxesHelper(2);
        book.add(helper);
        
        gameState.collectibles.push(book);
        scene.add(book);
        
        console.log(`Added book at position: x=${x}, y=${y}, z=${z}`);
    }
}

// In the game loop, add this to the collectibles check section:
function gameLoop(currentTime) {
    // ... existing game loop code ...

    // Check collectibles
    for (let i = gameState.collectibles.length - 1; i >= 0; i--) {
        const collectible = gameState.collectibles[i];
        
        // Animate collectible
        collectible.rotation.y += collectible.userData.rotationSpeed * gameState.deltaTime;
        collectible.position.y = collectible.userData.baseY + 
            Math.sin(gameState.time * 0.002 + collectible.userData.floatOffset) * 0.2;

        // Check collision with player
        if (collectible.position.distanceTo(hamster.position) < 2) {
            if (collectible.userData.type === 'book') {
                // Show dinosaur fact popup
                const popup = createFactPopup(collectible.userData.fact);
                document.body.appendChild(popup);
                
                // Create collection effect
                createExplosion(collectible.position, 0xFFD700);
                playSound('collect');
                
                // Remove book
                scene.remove(collectible);
                gameState.collectibles.splice(i, 1);
                
                // Add score
                const score = 100;
                gameState.score += score;
                showScorePopup(score, collectible.position);
                
                // Screen shake effect
                gameState.effects.screenShake = 0.2;
            } else {
                // Handle other collectibles (existing code)
                // ... existing collectible handling code ...
            }
        }
    }

    // ... rest of game loop code ...
}

// Make sure to call addBookCollectibles after the player is initialized
function initGame() {
    // ... existing initialization code ...
    
    // Add this line after player/hamster initialization
    addBookCollectibles();
}

// Modify initializeLevelElements to start appropriate music
function initializeLevelElements(level) {
    // Clear existing elements
    gameState.collectibles.forEach(c => scene.remove(c));
    gameState.collectibles.length = 0;
    gameState.obstacles.forEach(o => scene.remove(o));
    gameState.obstacles.length = 0;
    powerUpManager.powerUpPool.forEach(p => p.mesh && scene.remove(p.mesh));
    powerUpManager.powerUpPool.length = 0;

    // Set cloud manager level
    cloudManager.setLevel(level.id);

    // Set environment
    scene.background = new THREE.Color(level.environment.skyColor);
    terrainManager.setGroundColor(level.environment.groundColor);
    if (level.environment.fogDensity > 0) {
        scene.fog = new THREE.FogExp2(level.environment.skyColor, level.environment.fogDensity);
    } else {
        scene.fog = null;
    }

    // Add collectibles and books
    const collectiblePositions = levelManager.getCollectiblePositions();
    collectiblePositions.forEach(pos => {
        // Create collectible seed
        const collectible = createCollectibleSeed(pos.x, pos.y, pos.z);
        gameState.collectibles.push(collectible);
        scene.add(collectible);
        
        // Add a book next to each collectible with 50% chance
        if (Math.random() < 0.5) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 1.5; // Fixed distance from collectible
            
            const bookX = pos.x + Math.cos(angle) * distance;
            const bookZ = pos.z + Math.sin(angle) * distance;
            const bookY = terrainManager.getHeight(bookX, bookZ) + 2;
            
            const book = createBookCollectible(bookX, bookY, bookZ);
            
            // Make books larger and more visible
            book.scale.set(2, 2, 2);
            
            // Add glow effect
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xFFD700,
                transparent: true,
                opacity: 0.3
            });
            const glowGeometry = new THREE.BoxGeometry(1.2, 1.6, 0.3);
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            book.add(glow);
            
            // Add point light
            const bookLight = new THREE.PointLight(0xFFD700, 1, 3);
            bookLight.position.set(0, 0, 0);
            book.add(bookLight);
            
            gameState.collectibles.push(book);
            scene.add(book);
            
            console.log(`Added book at position: x=${bookX}, y=${bookY}, z=${bookZ}`);
        }
    });

    // ... rest of the function ...
}

// ... rest of the code ... 