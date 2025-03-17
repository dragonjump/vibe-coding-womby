// Import Three.js and required components
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

// Import level system, power-ups, and achievements
import { LevelManager, LEVELS } from './levels.js';
import { PowerUpManager, POWERUP_TYPES } from './powerups.js';
import { AchievementManager } from './achievements.js';

// Background music configuration
const MUSIC_TRACKS = {
    TRAINING: {
        frequency: 440, // A4 note
        notes: [0, 4, 7, 12, 7, 4], // Major chord arpeggio
        noteDuration: 0.2,
        tempo: 120
    },
    CLOUD_CITY: {
        frequency: 392, // G4 note
        notes: [0, 3, 7, 10, 7, 3], // Minor chord arpeggio
        noteDuration: 0.3,
        tempo: 100
    },
    SUNSET: {
        frequency: 349.23, // F4 note
        notes: [0, 5, 8, 12, 8, 5], // Diminished chord arpeggio
        noteDuration: 0.25,
        tempo: 140
    }
};

// Create pause menu first
const pauseMenu = document.createElement('div');
pauseMenu.style.position = 'absolute';
pauseMenu.style.top = '50%';
pauseMenu.style.left = '50%';
pauseMenu.style.transform = 'translate(-50%, -50%)';
pauseMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
pauseMenu.style.padding = '20px';
pauseMenu.style.borderRadius = '10px';
pauseMenu.style.display = 'none';
pauseMenu.style.textAlign = 'center';
pauseMenu.style.zIndex = '1000';
pauseMenu.innerHTML = `
    <h2 style="color: white; margin-bottom: 20px;">Game Paused</h2>
    <button id="resumeButton" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Resume</button>
    <button id="achievementsButton" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Achievements</button>
    <button id="restartButton" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Restart</button>
`;
document.body.appendChild(pauseMenu);

// Create managers
const levelManager = new LevelManager();
const powerUpManager = new PowerUpManager();
const achievementManager = new AchievementManager();

// Create canvas element
const canvas = document.createElement('canvas');
canvas.id = 'game-canvas';
document.body.appendChild(canvas);

// Modify game state to include level info
const gameState = {
    time: 0,
    deltaTime: 0,
    score: 0,
    state: 'start', // start, playing, paused, gameover, levelComplete
    level: 1,
    worldPosition: 0,
    keys: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false
    },
    player: {
        velocity: new THREE.Vector3(),
        speed: 10,
        jumpForce: 15,
        gravity: 30,
        fuel: 100,
        maxFuel: 100,
        fuelRegenRate: 20,
        boostForce: 20,
        seeds: 10,
        maxSeeds: 10,
        seedReloadTime: 1,
        lastSeedTime: 0,
        isInvulnerable: false,
        invulnerableTime: 0,
        flashTime: 0
    },
    projectiles: [],
    collectibles: [],
    obstacles: [],
    birds: [],
    scenery: {
        mountains: [],
        trees: [],
        lastGeneratedPosition: 0,
        generationDistance: 50
    },
    combo: {
        count: 0,
        timer: 0,
        maxTime: 2.0, // Time window for maintaining combo
        multiplier: 1,
        lastPosition: new THREE.Vector3()
    },
    effects: {
        screenShake: 0,
        fadeOpacity: 0,
        comboText: null,
        comboFlash: 0,
        explosions: []
    }
};

// Initialize clouds array
const clouds = [];

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Camera setup
const camera = new THREE.PerspectiveCamera(
    75, // FOV
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near plane
    1000 // Far plane
);
camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// Add a temporary ground plane to help visualize the scene
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x90EE90,  // Light green
    side: THREE.DoubleSide
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
scene.add(ground);

// Create clouds
function createCloud(x, y, z, size = 1) {
    const cloudGroup = new THREE.Group();
    
    // Create multiple spheres for each cloud
    const numPuffs = 6 + Math.floor(Math.random() * 5); // 6-10 puffs per cloud
    for (let i = 0; i < numPuffs; i++) {
        const puffGeometry = new THREE.SphereGeometry(1.5 * size, 16, 16);
        const puffMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85 + Math.random() * 0.1, // Varying opacity
        });
        const puff = new THREE.Mesh(puffGeometry, puffMaterial);
        
        // Randomized position within cloud group
        puff.position.x = (i - numPuffs/2) * (1.2 * size);
        puff.position.y = (Math.random() - 0.5) * (1.5 * size);
        puff.position.z = (Math.random() - 0.5) * (1.5 * size);
        
        // Random scale for more natural look
        const puffScale = (0.8 + Math.random() * 0.4) * size;
        puff.scale.set(puffScale, puffScale * 0.6, puffScale);
        
        cloudGroup.add(puff);
    }
    
    // Position the entire cloud
    cloudGroup.position.set(x, y, z);
    // Random rotation for variety
    cloudGroup.rotation.y = Math.random() * Math.PI;
    cloudGroup.rotation.z = (Math.random() - 0.5) * 0.2;
    return cloudGroup;
}

// Clear existing clouds
clouds.forEach(cloud => scene.remove(cloud));
clouds.length = 0;

// Add clouds at different layers
const cloudLayers = [
    { height: 15, count: 5, size: 1.5, spread: 50 },   // High, large clouds
    { height: 10, count: 8, size: 1.0, spread: 40 },   // Medium height, medium clouds
    { height: 6, count: 4, size: 0.7, spread: 30 },    // Low, small clouds
];

cloudLayers.forEach(layer => {
    for (let i = 0; i < layer.count; i++) {
        const x = (Math.random() - 0.5) * layer.spread;
        const y = layer.height + (Math.random() - 0.5) * 2;
        const z = (Math.random() - 0.5) * layer.spread;
        const cloud = createCloud(x, y, z, layer.size);
        clouds.push(cloud);
        scene.add(cloud);
    }
});

// Create seed projectile
function createSeed() {
    const seedGeometry = new THREE.SphereGeometry(0.2, 8, 8); // Made seed bigger
    const seedMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513,
        emissive: 0x4B2006, // Added glow
        emissiveIntensity: 0.5
    });
    const seed = new THREE.Mesh(seedGeometry, seedMaterial);
    
    // Add trail effect
    const trailGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0xA52A2A,
        transparent: true,
        opacity: 0.6
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    seed.add(trail);
    
    return seed;
}

// Create rocket particles
function createRocketParticle() {
    const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        new THREE.MeshBasicMaterial({ 
            color: 0xFF4400,
            transparent: true,
            opacity: 0.8
        })
    );
    particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        -Math.random() * 4,
        (Math.random() - 0.5) * 2
    );
    particle.lifetime = 0.5;
    return particle;
}

// Modify createHamster to add rocket exhaust point
function createHamster() {
    // Body
    const body = new THREE.Group();
    
    // Main body (sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xBB8855 }); // Brown color
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.add(bodyMesh);

    // Head (smaller sphere)
    const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xBB8855 });
    const headMesh = new THREE.Mesh(headGeometry, headMaterial);
    headMesh.position.z = 0.4;
    headMesh.position.y = 0.2;
    body.add(headMesh);

    // Ears (cones)
    const earGeometry = new THREE.ConeGeometry(0.15, 0.3, 8);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0xBB8855 });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(0.15, 0.5, 0.4);
    leftEar.rotation.x = -0.5;
    body.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(-0.15, 0.5, 0.4);
    rightEar.rotation.x = -0.5;
    body.add(rightEar);

    // Rocket pack (box)
    const rocketGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
    const rocketMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 }); // Gray color
    const rocketMesh = new THREE.Mesh(rocketGeometry, rocketMaterial);
    rocketMesh.position.z = -0.4;
    body.add(rocketMesh);

    // Add rocket exhaust point
    const exhaustPoint = new THREE.Object3D();
    exhaustPoint.position.set(0, -0.3, -0.4);
    body.add(exhaustPoint);
    body.exhaustPoint = exhaustPoint;

    return body;
}

// Create and add hamster to scene
const hamster = createHamster();
hamster.position.y = 2; // Start above ground
scene.add(hamster);

// Input handlers
function handleKeyDown(event) {
    switch(event.key.toLowerCase()) {
        case 'w': gameState.keys.forward = true; break;
        case 's': gameState.keys.backward = true; break;
        case 'a': gameState.keys.left = true; break;
        case 'd': gameState.keys.right = true; break;
        case ' ': gameState.keys.space = true; break;
        case 'shift': gameState.keys.shift = true; break;
    }
}

function handleKeyUp(event) {
    switch(event.key.toLowerCase()) {
        case 'w': gameState.keys.forward = false; break;
        case 's': gameState.keys.backward = false; break;
        case 'a': gameState.keys.left = false; break;
        case 'd': gameState.keys.right = false; break;
        case ' ': gameState.keys.space = false; break;
        case 'shift': gameState.keys.shift = false; break;
    }
}

// Create start screen
const startScreen = document.createElement('div');
startScreen.style.position = 'absolute';
startScreen.style.top = '50%';
startScreen.style.left = '50%';
startScreen.style.transform = 'translate(-50%, -50%)';
startScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
startScreen.style.padding = '20px';
startScreen.style.borderRadius = '10px';
startScreen.style.textAlign = 'center';
startScreen.style.zIndex = '1000';
startScreen.innerHTML = `
    <h1 style="color: white; margin-bottom: 20px;">Rocket Hamster Adventure</h1>
    <div style="color: white; margin-bottom: 20px;">
        <h2>Select Level:</h2>
        <div style="display: flex; flex-direction: column; gap: 10px; margin: 20px 0;">
            <button class="level-button" data-level="training" style="padding: 10px; cursor: pointer;">Training Grounds</button>
            <button class="level-button" data-level="cloud" style="padding: 10px; cursor: pointer;">Cloud City</button>
            <button class="level-button" data-level="sunset" style="padding: 10px; cursor: pointer;">Sunset Challenge</button>
        </div>
    </div>
    <p style="color: white; margin-bottom: 20px;">
        WASD - Move<br>
        SPACE - Jump<br>
        SHIFT - Rocket Boost<br>
        LEFT CLICK - Shoot Seeds<br>
        ESC - Pause
    </p>
    <button id="startButton" style="padding: 10px 20px; margin: 5px; cursor: pointer; font-size: 18px;">Start Game</button>
`;
document.body.appendChild(startScreen);

// Add level selection handlers
document.querySelectorAll('.level-button').forEach(button => {
    button.addEventListener('click', () => {
        // Update selected level visual feedback
        document.querySelectorAll('.level-button').forEach(b => 
            b.style.backgroundColor = '');
        button.style.backgroundColor = '#4CAF50';
        
        // Set the level
        levelManager.setLevel(button.dataset.level);
    });
});

// Update the start button handler
document.getElementById('startButton').addEventListener('click', () => {
    // Initialize audio system
    initAudioSystem();
    
    // Resume audio context if it exists
    if (audioContext) {
        audioContext.resume().then(() => {
            console.log('AudioContext resumed successfully');
        }).catch(error => {
            console.error('Error resuming AudioContext:', error);
        });
    }
    
    // Hide start screen and start game
    startScreen.style.display = 'none';
    gameState.state = 'playing';
    
    // Initialize level
    resetGame();
});

// Sound setup
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Create audio context and sounds
let audioContext = null;
let soundBuffers = {};

// Function to initialize audio system
function initAudioSystem() {
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioListener.context = audioContext;  // Ensure listener has context
        
        // Create sound buffers
        setupSynthSounds();
        
        console.log('Audio system initialized successfully');
    } catch (error) {
        console.error('Failed to initialize audio system:', error);
    }
}

// Function to create a synth sound buffer
function createSynthSound(type, frequency, duration, volume = 1) {
    if (!audioContext) {
        console.warn('Audio context not initialized');
        return null;
    }
    
    try {
        const sampleRate = audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            let sample = 0;

            switch (type) {
                case 'shoot':
                    // More distinct shooting sound
                    const freq = frequency + 800 * Math.exp(-t * 15);
                    sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 12) +
                            Math.sin(4 * Math.PI * freq * t) * 0.5 * Math.exp(-t * 12);
                    break;
                case 'jump':
                    // Rising tone
                    sample = Math.sin(2 * Math.PI * (frequency + 200 * t) * t) *
                            Math.exp(-t * 5);
                    break;
                case 'boost':
                    // White noise with filter
                    sample = (Math.random() * 2 - 1) * Math.exp(-t * 2);
                    break;
                case 'collect':
                    // Happy chime
                    sample = (Math.sin(2 * Math.PI * frequency * t) +
                             Math.sin(2 * Math.PI * (frequency * 1.5) * t)) *
                            Math.exp(-t * 8);
                    break;
                case 'hit':
                    // Impact sound
                    sample = (Math.random() * 2 - 1) * Math.exp(-t * 4) +
                            Math.sin(2 * Math.PI * 100 * t) * Math.exp(-t * 8);
                    break;
            }

            data[i] = sample * volume;
        }

        return buffer;
    } catch (error) {
        console.error('Error creating synth sound:', error);
        return null;
    }
}

// Create and set up sound buffers
function setupSynthSounds() {
    if (!audioContext) {
        console.warn('Cannot setup sounds - audio context not initialized');
        return;
    }
    
    try {
        const sounds = {
            shoot: { freq: 440, duration: 0.2, volume: 0.4 },
            jump: { freq: 300, duration: 0.3, volume: 0.4 },
            boost: { freq: 100, duration: 0.3, volume: 0.2 },
            collect: { freq: 600, duration: 0.2, volume: 0.4 },
            hit: { freq: 100, duration: 0.3, volume: 0.4 },
            achievement: { freq: 800, duration: 0.4, volume: 0.5 } // New achievement sound
        };

        Object.entries(sounds).forEach(([type, params]) => {
            const buffer = createSynthSound(type, params.freq, params.duration, params.volume);
            if (buffer) {
                soundBuffers[type] = buffer;
            }
        });

        console.log('Synth sounds created successfully');
    } catch (error) {
        console.error('Error setting up synth sounds:', error);
    }
}

// Function to play a sound safely
function playSound(soundType) {
    if (!audioContext || !soundBuffers[soundType]) {
        console.warn(`Cannot play ${soundType} - audio not initialized`);
        return;
    }

    try {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }

        const source = audioContext.createBufferSource();
        source.buffer = soundBuffers[soundType];
        
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0.5; // Adjust volume as needed
        
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        source.start(0);
    } catch (error) {
        console.warn(`Error playing ${soundType} sound:`, error);
    }
}

// Modify the handleClick function to use the new playSound function
function handleClick(event) {
    if (gameState.state !== 'playing') return;
    
    if (gameState.player.seeds > 0 && 
        gameState.time - gameState.player.lastSeedTime > gameState.player.seedReloadTime * 1000) {
        
        // Create multiple seeds in a spread pattern
        const numSeeds = 5;
        const spreadAngle = Math.PI / 4;
        
        for (let i = 0; i < numSeeds; i++) {
            const seed = createSeed();
            seed.position.copy(hamster.position);
            seed.position.y += 0.5;
            
            const angle = (i / (numSeeds - 1) - 0.5) * spreadAngle;
            const shootDirection = new THREE.Vector3(0, 1.5, -1).normalize();
            shootDirection.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            
            shootDirection.x += (Math.random() - 0.5) * 0.1;
            shootDirection.y += Math.random() * 0.1;
            
            seed.velocity = shootDirection.multiplyScalar(40);
            
            gameState.projectiles.push(seed);
            scene.add(seed);
        }
        
        // Play shoot sound using the new playSound function
        playSound('shoot');
        
        gameState.player.seeds--;
        gameState.player.lastSeedTime = gameState.time;
        gameState.player.seedReloadTime = 0.2;
    }
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('click', handleClick);

// Window resize handler
window.addEventListener('resize', () => {
    // Update camera
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Create collectible seed
function createCollectibleSeed(x, y, z) {
    const seed = new THREE.Group();
    
    // Seed body
    const seedGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const seedMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFD700, // Gold color
        metalness: 0.7,
        roughness: 0.3
    });
    const seedMesh = new THREE.Mesh(seedGeometry, seedMaterial);
    seed.add(seedMesh);
    
    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFF00,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    seed.add(glow);
    
    seed.position.set(x, y, z);
    seed.userData.type = 'collectible';
    seed.userData.baseY = y;
    return seed;
}

// Create obstacle
function createObstacle(x, y, z, width = 1, height = 2, depth = 1) {
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xFF4444,
        metalness: 0.3,
        roughness: 0.7
    });
    const obstacle = new THREE.Mesh(geometry, material);
    obstacle.position.set(x, y + height/2, z);
    obstacle.userData.type = 'obstacle';
    
    // Add collision box
    obstacle.userData.boundingBox = new THREE.Box3().setFromObject(obstacle);
    return obstacle;
}

// Create level complete screen
const levelCompleteScreen = document.createElement('div');
levelCompleteScreen.style.position = 'absolute';
levelCompleteScreen.style.top = '50%';
levelCompleteScreen.style.left = '50%';
levelCompleteScreen.style.transform = 'translate(-50%, -50%)';
levelCompleteScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
levelCompleteScreen.style.padding = '20px';
levelCompleteScreen.style.borderRadius = '10px';
levelCompleteScreen.style.display = 'none';
levelCompleteScreen.style.textAlign = 'center';
levelCompleteScreen.style.zIndex = '1000';
levelCompleteScreen.innerHTML = `
    <h2 style="color: white; margin-bottom: 20px;">Level Complete!</h2>
    <p style="color: white; margin-bottom: 20px;">Score: <span id="finalScore">0</span></p>
    <p style="color: gold; margin-bottom: 20px;" id="newHighScore" style="display: none;">New High Score!</p>
    <button id="nextLevelButton" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Next Level</button>
`;
document.body.appendChild(levelCompleteScreen);

// Create UI container
const uiContainer = document.createElement('div');
uiContainer.id = 'ui-container';
uiContainer.style.position = 'fixed';
uiContainer.style.top = '20px';
uiContainer.style.left = '20px';
uiContainer.style.color = 'white';
uiContainer.style.fontFamily = 'Arial, sans-serif';
document.body.appendChild(uiContainer);

// Create UI elements
const scoreElement = document.createElement('div');
scoreElement.id = 'score';
scoreElement.style.fontSize = '20px';
scoreElement.style.width = '200px';
scoreElement.style.marginBottom = '10px';
uiContainer.appendChild(scoreElement);

const resourceElement = document.createElement('div');
resourceElement.id = 'fuel';
resourceElement.style.fontSize = '18px';
resourceElement.style.marginBottom = '10px';
uiContainer.appendChild(resourceElement);

const seedsElement = document.createElement('div');
seedsElement.id = 'seeds';
seedsElement.style.fontSize = '18px';
uiContainer.appendChild(seedsElement);

// Create combo text element
const comboText = document.createElement('div');
comboText.style.position = 'fixed';
comboText.style.top = '50%';
comboText.style.left = '50%';
comboText.style.transform = 'translate(-50%, -50%)';
comboText.style.color = 'white';
comboText.style.fontSize = '48px';
comboText.style.fontWeight = 'bold';
comboText.style.textShadow = '0 0 10px rgba(255, 165, 0, 1)';
comboText.style.opacity = '0';
comboText.style.transition = 'opacity 0.3s, font-size 0.3s';
comboText.style.pointerEvents = 'none';
comboText.style.zIndex = '1000';
document.body.appendChild(comboText);

// Store combo text element in gameState
gameState.effects.comboText = comboText;

// Create power-ups UI element
const powerUpsElement = document.createElement('div');
powerUpsElement.id = 'power-ups';
powerUpsElement.style.fontSize = '16px';
powerUpsElement.style.marginTop = '10px';
powerUpsElement.style.display = 'none';
uiContainer.appendChild(powerUpsElement);

// Create overlay for visual effects
const overlayElement = document.createElement('div');
overlayElement.style.position = 'fixed';
overlayElement.style.top = '0';
overlayElement.style.left = '0';
overlayElement.style.width = '100%';
overlayElement.style.height = '100%';
overlayElement.style.pointerEvents = 'none';
overlayElement.style.transition = 'background-color 0.1s';
overlayElement.style.backgroundColor = 'transparent';
document.body.appendChild(overlayElement);

// Create achievements menu
const achievementsMenu = document.createElement('div');
achievementsMenu.style.position = 'absolute';
achievementsMenu.style.top = '50%';
achievementsMenu.style.left = '50%';
achievementsMenu.style.transform = 'translate(-50%, -50%)';
achievementsMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
achievementsMenu.style.padding = '20px';
achievementsMenu.style.borderRadius = '10px';
achievementsMenu.style.display = 'none';
achievementsMenu.style.color = 'white';
achievementsMenu.style.minWidth = '300px';
achievementsMenu.style.maxHeight = '80vh';
achievementsMenu.style.overflowY = 'auto';
achievementsMenu.style.zIndex = '1000';
document.body.appendChild(achievementsMenu);

// Update achievements menu content
function updateAchievementsMenu() {
    const achievements = achievementManager.getProgress();
    achievementsMenu.innerHTML = `
        <h2 style="margin-bottom: 20px; text-align: center;">Achievements</h2>
        <div style="display: flex; flex-direction: column; gap: 15px;">
            ${achievements.map(achievement => `
                <div style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px;
                    background-color: rgba(255, 255, 255, ${achievement.unlocked ? '0.2' : '0.1'});
                    border-radius: 5px;
                ">
                    <div style="font-size: 24px;">${achievement.icon}</div>
                    <div>
                        <div style="font-weight: bold;">${achievement.name}</div>
                        <div style="font-size: 0.9em; opacity: 0.8;">${achievement.description}</div>
                        ${!achievement.unlocked ? `
                            <div style="font-size: 0.8em; margin-top: 5px;">
                                Progress: ${Math.min(achievement.progress, achievement.requirement)}/${achievement.requirement}
                            </div>
                        ` : ''}
                    </div>
                    ${achievement.unlocked ? `
                        <div style="margin-left: auto; color: #4CAF50;">✓</div>
                    ` : ''}
                </div>
            `).join('')}
        </div>
        <button id="closeAchievementsButton" style="
            display: block;
            margin: 20px auto 0;
            padding: 10px 20px;
            cursor: pointer;
        ">Close</button>
    `;

    document.getElementById('closeAchievementsButton').addEventListener('click', () => {
        achievementsMenu.style.display = 'none';
        pauseMenu.style.display = 'block';
    });
}

// Add achievements button handler
document.getElementById('achievementsButton').addEventListener('click', () => {
    pauseMenu.style.display = 'none';
    updateAchievementsMenu();
    achievementsMenu.style.display = 'block';
});

let currentMusicTrack = null;
let musicGainNode = null;

// Create synth music
function createMusicNote(frequency, time, gainNode) {
    if (!audioContext) return null;
    
    const oscillator = audioContext.createOscillator();
    const noteGain = audioContext.createGain();
    
    // Use multiple waveforms for richer sound
    oscillator.type = 'sine';
    const secondOsc = audioContext.createOscillator();
    secondOsc.type = 'triangle';
    secondOsc.frequency.value = frequency * 2;
    
    // Envelope settings
    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(0.3, time + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    
    oscillator.connect(noteGain);
    secondOsc.connect(noteGain);
    noteGain.connect(gainNode);
    
    oscillator.frequency.value = frequency;
    oscillator.start(time);
    oscillator.stop(time + 0.5);
    
    secondOsc.start(time);
    secondOsc.stop(time + 0.5);
    
    return { oscillator, secondOsc };
}

function playBackgroundMusic(track) {
    if (!audioContext || currentMusicTrack === track) return;
    
    currentMusicTrack = track;
    
    if (!musicGainNode) {
        musicGainNode = audioContext.createGain();
        musicGainNode.gain.value = 0.2; // Lower volume for background music
        musicGainNode.connect(audioContext.destination);
    }
    
    const baseFreq = track.frequency;
    const noteDuration = 60 / track.tempo;
    let currentTime = audioContext.currentTime;
    
    function scheduleNotes() {
        track.notes.forEach((note, index) => {
            const freq = baseFreq * Math.pow(2, note / 12);
            createMusicNote(freq, currentTime + index * noteDuration, musicGainNode);
        });
        
        currentTime += track.notes.length * noteDuration;
        
        // Schedule next iteration slightly before current sequence ends
        setTimeout(() => {
            if (currentMusicTrack === track) {
                scheduleNotes();
            }
        }, (track.notes.length * noteDuration - 0.1) * 1000);
    }
    
    scheduleNotes();
}

// Mobile controls
const touchControls = document.createElement('div');
touchControls.style.position = 'fixed';
touchControls.style.bottom = '20px';
touchControls.style.left = '50%';
touchControls.style.transform = 'translateX(-50%)';
touchControls.style.display = 'none';
touchControls.style.zIndex = '1000';
touchControls.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
        <button id="jumpBtn" style="
            grid-column: 2;
            padding: 20px;
            background: rgba(255,255,255,0.5);
            border: none;
            border-radius: 50%;
            font-size: 24px;
        ">↑</button>
        <button id="leftBtn" style="
            padding: 20px;
            background: rgba(255,255,255,0.5);
            border: none;
            border-radius: 50%;
            font-size: 24px;
        ">←</button>
        <button id="boostBtn" style="
            padding: 20px;
            background: rgba(255,255,255,0.5);
            border: none;
            border-radius: 50%;
            font-size: 24px;
        ">🚀</button>
        <button id="rightBtn" style="
            padding: 20px;
            background: rgba(255,255,255,0.5);
            border: none;
            border-radius: 50%;
            font-size: 24px;
        ">→</button>
    </div>
`;
document.body.appendChild(touchControls);

// Show/hide touch controls based on device
function updateTouchControls() {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    touchControls.style.display = isMobile ? 'block' : 'none';
}

// Initial check for touch controls
updateTouchControls();
window.addEventListener('resize', updateTouchControls);

// Touch control event handlers
const touchButtons = {
    jumpBtn: { press: () => gameState.keys.space = true, release: () => gameState.keys.space = false },
    leftBtn: { press: () => gameState.keys.left = true, release: () => gameState.keys.left = false },
    rightBtn: { press: () => gameState.keys.right = true, release: () => gameState.keys.right = false },
    boostBtn: { press: () => gameState.keys.shift = true, release: () => gameState.keys.shift = false }
};

Object.entries(touchButtons).forEach(([id, handlers]) => {
    const button = document.getElementById(id);
    button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handlers.press();
    });
    button.addEventListener('touchend', (e) => {
        e.preventDefault();
        handlers.release();
    });
});

// Add shooting control for mobile
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (gameState.state === 'playing') {
        handleClick(e);
    }
});

// Modify initializeLevelElements to start appropriate music
function initializeLevelElements() {
    // Clear existing elements
    gameState.collectibles.forEach(c => scene.remove(c));
    gameState.collectibles.length = 0;
    gameState.obstacles.forEach(o => scene.remove(o));
    gameState.obstacles.length = 0;
    powerUpManager.powerUpPool.forEach(p => p.mesh && scene.remove(p.mesh));
    powerUpManager.powerUpPool.length = 0;

    const currentLevel = levelManager.getCurrentLevel();

    // Set environment
    scene.background = new THREE.Color(currentLevel.environment.skyColor);
    ground.material.color.setHex(currentLevel.environment.groundColor);
    if (currentLevel.environment.fogDensity > 0) {
        scene.fog = new THREE.FogExp2(currentLevel.environment.skyColor, currentLevel.environment.fogDensity);
    } else {
        scene.fog = null;
    }

    // Add collectibles
    const collectiblePositions = levelManager.getCollectiblePositions();
    collectiblePositions.forEach(pos => {
        const collectible = createCollectibleSeed(pos.x, pos.y, pos.z);
        gameState.collectibles.push(collectible);
        scene.add(collectible);
    });

    // Add power-ups
    currentLevel.powerUps.forEach(powerUp => {
        const type = POWERUP_TYPES[powerUp.type];
        if (type) {
            const mesh = createPowerUpMesh(type);
            mesh.position.set(powerUp.x, powerUp.y, powerUp.z);
            scene.add(mesh);
            powerUpManager.powerUpPool.push({
                type: type,
                position: mesh.position,
                mesh: mesh,
                collected: false
            });
        }
    });

    // Add obstacles with enhanced visuals and behaviors
    currentLevel.obstacles.forEach(obs => {
        // Create obstacle mesh with enhanced materials
        const geometry = new THREE.BoxGeometry(obs.w, obs.h, obs.d);
        const material = new THREE.MeshStandardMaterial({
            color: 0xFF4444,
            metalness: 0.6,
            roughness: 0.4,
            emissive: 0xFF0000,
            emissiveIntensity: 0.2
        });
        const obstacle = new THREE.Mesh(geometry, material);
        
        // Add glow effect
        const glowGeometry = new THREE.BoxGeometry(obs.w + 0.2, obs.h + 0.2, obs.d + 0.2);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF6666,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        obstacle.add(glow);

        // Position and setup
        obstacle.position.set(obs.x, obs.y + obs.h/2, obs.z);
        obstacle.userData.type = 'obstacle';
        obstacle.userData.boundingBox = new THREE.Box3().setFromObject(obstacle);
        
        // Add movement properties if specified
        if (obs.moving) {
            obstacle.userData.moving = true;
            obstacle.userData.startPos = obstacle.position.clone();
            obstacle.userData.speed = obs.speed || 1;
            obstacle.userData.time = Math.random() * Math.PI * 2; // Random start phase
            
            // Add warning particles
            const particleSystem = new THREE.Group();
            for (let i = 0; i < 5; i++) {
                const particle = new THREE.Mesh(
                    new THREE.SphereGeometry(0.1, 4, 4),
                    new THREE.MeshBasicMaterial({
                        color: 0xFF0000,
                        transparent: true,
                        opacity: 0.7
                    })
                );
                const angle = (i / 5) * Math.PI * 2;
                particle.position.set(
                    Math.cos(angle) * (obs.w/2 + 0.3),
                    obs.h/2,
                    Math.sin(angle) * (obs.d/2 + 0.3)
                );
                particleSystem.add(particle);
            }
            obstacle.add(particleSystem);
            
            // Animate warning particles
            function animateParticles() {
                particleSystem.children.forEach((particle, i) => {
                    particle.material.opacity = 0.3 + Math.sin(Date.now() * 0.005 + i) * 0.4;
                });
                requestAnimationFrame(animateParticles);
            }
            animateParticles();
        }

        // Add to game state and scene
        gameState.obstacles.push(obstacle);
        scene.add(obstacle);
    });

    // Start level-specific music
    const musicTracks = {
        1: MUSIC_TRACKS.TRAINING,
        2: MUSIC_TRACKS.CLOUD_CITY,
        3: MUSIC_TRACKS.SUNSET
    };
    playBackgroundMusic(musicTracks[currentLevel.id]);

    // Reset player position
    hamster.position.set(0, 2, 0);
    gameState.player.velocity.set(0, 0, 0);
}

// Update game loop to handle moving obstacles
function updateObstacles(currentTime) {
    gameState.obstacles.forEach(obstacle => {
        if (obstacle.userData.moving) {
            obstacle.userData.time += gameState.deltaTime;
            const t = obstacle.userData.time * obstacle.userData.speed;
            
            // Get the obstacle's level index (0-based)
            const levelIndex = levelManager.getCurrentLevel().id - 1;
            
            // Different movement patterns based on level
            switch(levelIndex) {
                case 0: // Training Grounds - Simple circular motion
                    const radius = 5;
                    obstacle.position.x = obstacle.userData.startPos.x + Math.cos(t) * radius;
                    obstacle.position.z = obstacle.userData.startPos.z + Math.sin(t) * radius;
                    break;
                    
                case 1: // Cloud City - Figure-8 pattern
                    const scale = 4;
                    obstacle.position.x = obstacle.userData.startPos.x + Math.sin(t) * scale;
                    obstacle.position.z = obstacle.userData.startPos.z + Math.sin(t * 2) * (scale / 2);
                    obstacle.position.y = obstacle.userData.startPos.y + Math.cos(t) * (scale / 3);
                    break;
                    
                case 2: // Sunset Challenge - Complex spiral pattern
                    const spiralRadius = 3 + Math.sin(t * 0.5) * 2;
                    const heightOffset = Math.cos(t * 0.3) * 2;
                    obstacle.position.x = obstacle.userData.startPos.x + Math.cos(t) * spiralRadius;
                    obstacle.position.z = obstacle.userData.startPos.z + Math.sin(t) * spiralRadius;
                    obstacle.position.y = obstacle.userData.startPos.y + heightOffset;
                    
                    // Add rotation for more challenge
                    obstacle.rotation.y = t;
                    break;
            }
            
            // Update bounding box for collision detection
            obstacle.userData.boundingBox.setFromObject(obstacle);
            
            // Update warning particles
            if (obstacle.children.length > 1) { // First child is glow, second is particle system
                const particleSystem = obstacle.children[1];
                particleSystem.rotation.y = -obstacle.rotation.y; // Counter-rotate particles
            }
        }
    });
}

function updateUI() {
    const currentLevel = levelManager.getCurrentLevel();
    scoreElement.innerHTML = `
        Level ${currentLevel.id}: ${currentLevel.name}<br>
        Score: ${gameState.score} / ${currentLevel.targetScore}<br>
        High Score: ${levelManager.highScores.get(currentLevel.id) || 0}
    `;
    resourceElement.textContent = `Fuel: ${Math.round(gameState.player.fuel)}%`;
    seedsElement.textContent = `Seeds: ${gameState.player.seeds}`;

    // Update power-ups display
    const activePowerUps = powerUpManager.getActivePowerUps();
    if (activePowerUps.length > 0) {
        const powerUpText = activePowerUps
            .map(p => `${p.name}: ${p.timeRemaining}s`)
            .join(' | ');
        powerUpsElement.textContent = `Active Power-ups: ${powerUpText}`;
        powerUpsElement.style.display = 'block';
    } else {
        powerUpsElement.style.display = 'none';
    }

    // Add combo multiplier to score display
    if (gameState.combo.count > 0) {
        scoreElement.innerHTML += `<br>Combo: x${gameState.combo.multiplier}`;
    }
}

// Add level complete handling
function checkLevelComplete() {
    if (levelManager.isLevelComplete(gameState.score)) {
        gameState.state = 'levelComplete';
        levelCompleteScreen.style.display = 'block';
        document.getElementById('finalScore').textContent = gameState.score;
        
        // Check for high score
        const isNewHighScore = levelManager.saveHighScore(levelManager.currentLevel, gameState.score);
        document.getElementById('newHighScore').style.display = isNewHighScore ? 'block' : 'none';
        
        // Hide next level button if this is the last level
        document.getElementById('nextLevelButton').style.display = 
            levelManager.currentLevel < LEVELS.length ? 'block' : 'none';
        
        // Check achievements
        achievementManager.checkLevelComplete(
            levelManager.currentLevel,
            gameState.score,
            levelManager.highScores.get(levelManager.currentLevel) || 0
        );
    }
}

// Handle next level button
document.getElementById('nextLevelButton').addEventListener('click', () => {
    if (levelManager.nextLevel()) {
        // Update URL when moving to next level
        const currentLevel = levelManager.getCurrentLevel();
        const url = new URL(window.location);
        url.searchParams.set('level', currentLevel.urlName);
        window.history.pushState({}, '', url);
        
        levelCompleteScreen.style.display = 'none';
        gameState.state = 'playing';
        resetGame();
    }
});

// Update reset game function
function resetGame() {
    gameState.score = 0;
    gameState.player.fuel = gameState.player.maxFuel;
    gameState.player.seeds = gameState.player.maxSeeds;
    hamster.position.set(0, 2, 0);
    gameState.player.velocity.set(0, 0, 0);
    initializeLevelElements();
    achievementManager.startLevel();
}

// Add escape key handler for pause
window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        if (gameState.state === 'playing') {
            gameState.state = 'paused';
            pauseMenu.style.display = 'block';
        } else if (gameState.state === 'paused') {
            gameState.state = 'playing';
            pauseMenu.style.display = 'none';
        }
    }
});

// Pause game handlers
document.getElementById('resumeButton').addEventListener('click', () => {
    gameState.state = 'playing';
    pauseMenu.style.display = 'none';
});

document.getElementById('restartButton').addEventListener('click', () => {
    resetGame();
    gameState.state = 'playing';
    pauseMenu.style.display = 'none';
});

// Modify game loop to include effects and state management
function gameLoop(currentTime) {
    // Skip updates if paused or in level complete state
    if (gameState.state === 'paused' || gameState.state === 'levelComplete') {
        requestAnimationFrame(gameLoop);
        return;
    }

    // First frame initialization
    if (!gameState.time) {
        gameState.time = currentTime;
    }
    
    // Calculate delta time
    gameState.deltaTime = (currentTime - gameState.time) / 1000;
    gameState.time = currentTime;

    // Update world generation
    updateWorld();
    
    // Update birds
    updateBirds();
    
    // Update explosions
    updateExplosions();

    // Update hamster position based on input
    const moveSpeed = gameState.player.speed * gameState.deltaTime;
    
    // Apply movement
    if (gameState.keys.forward) {
        hamster.position.z -= moveSpeed;
        // Generate new world as player moves forward
        if (hamster.position.z < gameState.scenery.lastGeneratedPosition - gameState.scenery.generationDistance) {
            generateNewWorldChunk();
        }
    }
    if (gameState.keys.backward) hamster.position.z += moveSpeed;
    if (gameState.keys.left) hamster.position.x -= moveSpeed;
    if (gameState.keys.right) hamster.position.x += moveSpeed;

    // Apply gravity and jumping
    gameState.player.velocity.y -= gameState.player.gravity * gameState.deltaTime;
    if (gameState.keys.space && hamster.position.y <= 2) {
        gameState.player.velocity.y = gameState.player.jumpForce;
    }

    // Update vertical position
    hamster.position.y += gameState.player.velocity.y * gameState.deltaTime;

    // Ground collision
    if (hamster.position.y < 2) {
        hamster.position.y = 2;
        gameState.player.velocity.y = 0;
    }

    // Update camera to follow hamster
    camera.position.x = hamster.position.x;
    camera.position.y = hamster.position.y + 3;
    camera.position.z = hamster.position.z + 10;
    camera.lookAt(hamster.position);

    // Animate clouds with varied movement
    clouds.forEach((cloud, index) => {
        const speed = 0.0003 + (index % 3) * 0.0002;
        const amplitude = 0.01 + (index % 2) * 0.01;
        
        cloud.position.x += Math.sin(currentTime * speed + index) * amplitude;
        cloud.position.y += Math.cos(currentTime * speed + index) * (amplitude * 0.5);
        cloud.rotation.y += 0.0001 * (1 + index % 2);
    });

    // Update fuel
    if (!gameState.keys.shift) {
        gameState.player.fuel = Math.min(
            gameState.player.fuel + gameState.player.fuelRegenRate * gameState.deltaTime,
            gameState.player.maxFuel
        );
    }

    // Apply rocket boost
    if (gameState.keys.shift && gameState.player.fuel > 0) {
        gameState.player.velocity.y += gameState.player.boostForce * gameState.deltaTime;
        gameState.player.fuel -= 30 * gameState.deltaTime;

        // Add rocket particles
        if (Math.random() < 0.3) {
            const particle = createRocketParticle();
            const worldPos = new THREE.Vector3();
            hamster.exhaustPoint.getWorldPosition(worldPos);
            particle.position.copy(worldPos);
            scene.add(particle);
            gameState.projectiles.push(particle);
        }
    }

    // Update projectiles
    for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
        const projectile = gameState.projectiles[i];
        
        if (projectile.lifetime !== undefined) {
            // Particle update
            projectile.lifetime -= gameState.deltaTime;
            if (projectile.lifetime <= 0) {
                scene.remove(projectile);
                gameState.projectiles.splice(i, 1);
                continue;
            }
            projectile.material.opacity = projectile.lifetime / 0.5;
        } else {
            // Seed update
            projectile.velocity.y -= gameState.player.gravity * 1.5 * gameState.deltaTime; // Increased gravity effect
            
            // Rotate seed for better visual
            projectile.rotation.x += 5 * gameState.deltaTime;
            projectile.rotation.z += 3 * gameState.deltaTime;
            
            // Update trail
            if (projectile.children[0]) {
                projectile.children[0].scale.setScalar(
                    Math.max(0.1, projectile.velocity.length() * 0.05)
                );
            }
        }
        
        projectile.position.add(
            projectile.velocity.clone().multiplyScalar(gameState.deltaTime)
        );

        // Remove seeds that fall below ground
        if (projectile.position.y < 0) {
            scene.remove(projectile);
            gameState.projectiles.splice(i, 1);
        }
    }

    // Regenerate seeds over time
    if (gameState.player.seeds < gameState.player.maxSeeds && 
        currentTime - gameState.player.lastSeedTime > gameState.player.seedReloadTime * 1000) {
        gameState.player.seeds++;
    }

    // Animate collectibles
    gameState.collectibles.forEach(seed => {
        seed.position.y = seed.userData.baseY + Math.sin(currentTime * 0.002) * 0.2;
        seed.rotation.y += 0.02;
        
        // Check collection
        if (seed.visible && hamster.position.distanceTo(seed.position) < 1) {
            seed.visible = false;
            const baseScore = 100;
            const comboScore = baseScore * gameState.combo.multiplier;
            gameState.score += comboScore;
            gameState.player.seeds = Math.min(gameState.player.maxSeeds, gameState.player.seeds + 3);
            
            // Update combo
            incrementCombo(seed.position);
            
            playSound('collect');
            gameState.effects.screenShake = 0.1;
            
            // Show score popup
            showScorePopup(comboScore, seed.position);
            
            // Create collection effect
            for (let i = 0; i < 10; i++) {
                const particle = createRocketParticle();
                particle.material.color.setHex(0xFFD700);
                particle.position.copy(seed.position);
                particle.velocity.set(
                    (Math.random() - 0.5) * 5,
                    Math.random() * 5,
                    (Math.random() - 0.5) * 5
                );
                scene.add(particle);
                gameState.projectiles.push(particle);
            }
            achievementManager.collectSeed();
        }
    });

    // Check obstacle collisions
    gameState.obstacles.forEach(obstacle => {
        const hamsterBox = new THREE.Box3().setFromObject(hamster);
        if (!gameState.player.isInvulnerable && hamsterBox.intersectsBox(obstacle.userData.boundingBox)) {
            playSound('hit');
            gameState.effects.screenShake = 0.3;
            
            // Flash overlay
            overlayElement.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
            setTimeout(() => {
                overlayElement.style.backgroundColor = 'transparent';
            }, 100);
            
            // Make player invulnerable briefly
            gameState.player.isInvulnerable = true;
            gameState.player.invulnerableTime = 1.5;
            gameState.player.flashTime = 0;
            
            // Collision response
            const pushDirection = hamster.position.clone().sub(obstacle.position).normalize();
            hamster.position.add(pushDirection.multiplyScalar(0.1));
            gameState.player.velocity.multiplyScalar(0.5);
            achievementManager.hitObstacleEvent();
        }
    });

    // Update screen shake effect
    if (gameState.effects.screenShake > 0) {
        const shakeIntensity = gameState.effects.screenShake;
        camera.position.x += (Math.random() - 0.5) * shakeIntensity;
        camera.position.y += (Math.random() - 0.5) * shakeIntensity;
        gameState.effects.screenShake *= 0.9;
    }

    // Update player invulnerability
    if (gameState.player.isInvulnerable) {
        gameState.player.invulnerableTime -= gameState.deltaTime;
        gameState.player.flashTime += gameState.deltaTime * 10;
        
        // Flash effect
        hamster.traverse(child => {
            if (child.material) {
                child.material.transparent = true;
                child.material.opacity = Math.sin(gameState.player.flashTime) * 0.5 + 0.5;
            }
        });
        
        if (gameState.player.invulnerableTime <= 0) {
            gameState.player.isInvulnerable = false;
            hamster.traverse(child => {
                if (child.material) {
                    child.material.transparent = false;
                    child.material.opacity = 1;
                }
            });
        }
    }

    // Add obstacle updates
    updateObstacles(currentTime);

    // Check for level completion
    checkLevelComplete();

    // Update UI with level info
    updateUI();

    // Update power-ups
    powerUpManager.updatePowerUps(gameState.deltaTime, currentTime);
    
    // Check power-up collection
    powerUpManager.powerUpPool.forEach(powerUp => {
        if (!powerUp.collected && powerUp.mesh && 
            hamster.position.distanceTo(powerUp.position) < 1.5) {
            
            powerUp.collected = true;
            powerUp.mesh.visible = false;
            
            // Activate power-up
            powerUpManager.activatePowerUp(powerUp, gameState.player);
            
            // Play collect sound
            playSound('collect');
            
            // Visual effects
            gameState.effects.screenShake = 0.2;
            overlayElement.style.backgroundColor = `rgba(${powerUp.type.color.toString(16)}, 0.2)`;
            setTimeout(() => {
                overlayElement.style.backgroundColor = 'transparent';
            }, 100);
            
            // Create collection particles
            for (let i = 0; i < 15; i++) {
                const particle = createRocketParticle();
                particle.material.color.setHex(powerUp.type.color);
                particle.position.copy(powerUp.position);
                particle.velocity.set(
                    (Math.random() - 0.5) * 8,
                    Math.random() * 8,
                    (Math.random() - 0.5) * 8
                );
                scene.add(particle);
                gameState.projectiles.push(particle);
            }
            achievementManager.collectPowerUp();
        }
    });

    // Track flight time for achievement
    const isAirborne = hamster.position.y > 2.1;
    achievementManager.updateFlightTime(isAirborne, gameState.deltaTime);

    // Update day/night cycle
    dayNightCycle.update(gameState.deltaTime);
    
    // Update particle system
    particleSystem.update(gameState.deltaTime);
    
    // Update spotlight to follow player
    lights.spotlight.position.set(
        hamster.position.x,
        20,
        hamster.position.z
    );
    lights.spotlight.target = hamster;

    // Update combo system
    updateCombo(gameState.deltaTime);
    
    // Update combo text flash effect
    if (gameState.effects.comboFlash > 0) {
        gameState.effects.comboFlash -= gameState.deltaTime;
        const flash = Math.sin(gameState.effects.comboFlash * 20) * 0.5 + 0.5;
        gameState.effects.comboText.style.textShadow = 
            `0 0 ${10 + flash * 20}px rgba(255, ${flash * 255}, 0, ${flash})`;
    }

    // Check bird collisions
    gameState.birds.forEach(bird => {
        if (!gameState.player.isInvulnerable && hamster.position.distanceTo(bird.position) < 1) {
            createExplosion(hamster.position);
            playSound('hit');
            gameState.effects.screenShake = 0.3;
            
            // Make player invulnerable
            gameState.player.isInvulnerable = true;
            gameState.player.invulnerableTime = 1.5;
            gameState.player.flashTime = 0;
            
            // Push player away from bird
            const pushDirection = hamster.position.clone().sub(bird.position).normalize();
            gameState.player.velocity.add(pushDirection.multiplyScalar(15));
        }
    });

    // Only render if not in start state
    if (gameState.state !== 'start') {
        renderer.render(scene, camera);
    }

    requestAnimationFrame(gameLoop);
}

function generateNewWorldChunk() {
    const chunkSize = gameState.scenery.generationDistance;
    const newZ = gameState.scenery.lastGeneratedPosition - chunkSize;
    
    // Add mountains
    for (let i = 0; i < 3; i++) {
        const x = (Math.random() - 0.5) * 100;
        const height = 10 + Math.random() * 20;
        const mountain = createMountain(x, newZ, height);
        scene.add(mountain);
        gameState.scenery.mountains.push(mountain);
    }
    
    // Add trees
    for (let i = 0; i < 10; i++) {
        const x = (Math.random() - 0.5) * 80;
        const z = newZ + (Math.random() - 0.5) * 20;
        const tree = createTree(x, z);
        scene.add(tree);
        gameState.scenery.trees.push(tree);
    }
    
    // Add birds
    if (Math.random() < 0.7) {
        const bird = createBird();
        bird.position.set(
            (Math.random() - 0.5) * 40,
            10 + Math.random() * 10,
            newZ + (Math.random() - 0.5) * 20
        );
        scene.add(bird);
        gameState.birds.push(bird);
    }
    
    // Update last generated position
    gameState.scenery.lastGeneratedPosition = newZ;
    
    // Clean up old scenery
    const cleanupZ = hamster.position.z + 100;
    const cleanup = (array, removeCallback) => {
        return array.filter(item => {
            if (item.position.z > cleanupZ) {
                removeCallback(item);
                return false;
            }
            return true;
        });
    };
    
    gameState.scenery.mountains = cleanup(gameState.scenery.mountains, mountain => scene.remove(mountain));
    gameState.scenery.trees = cleanup(gameState.scenery.trees, tree => scene.remove(tree));
    gameState.birds = cleanup(gameState.birds, bird => scene.remove(bird));
}

// Initialize first level
initializeLevelElements();

// Start game loop
requestAnimationFrame(gameLoop);

// Log initialization success
console.log('Three.js scene initialized successfully with clouds');

// Create power-up mesh
function createPowerUpMesh(powerUpType) {
    const group = new THREE.Group();
    
    // Core geometry
    const coreGeometry = new THREE.OctahedronGeometry(0.5, 0);
    const coreMaterial = new THREE.MeshStandardMaterial({
        color: powerUpType.color,
        metalness: 0.7,
        roughness: 0.3,
        emissive: powerUpType.color,
        emissiveIntensity: 0.5
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);
    
    // Outer glow
    const glowGeometry = new THREE.OctahedronGeometry(0.7, 0);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: powerUpType.color,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);
    
    // Particles
    const particleCount = 5;
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.1, 4, 4),
            new THREE.MeshBasicMaterial({
                color: powerUpType.color,
                transparent: true,
                opacity: 0.5
            })
        );
        
        const angle = (i / particleCount) * Math.PI * 2;
        particle.position.set(
            Math.cos(angle) * 0.8,
            Math.sin(angle) * 0.8,
            0
        );
        group.add(particle);
    }
    
    // Add point light
    const powerLight = new THREE.PointLight(powerUpType.color, 1, 3);
    powerLight.position.set(0, 0, 0);
    group.add(powerLight);
    
    // Animate light intensity
    function animateLight() {
        const intensity = 0.7 + Math.sin(Date.now() * 0.005) * 0.3;
        powerLight.intensity = intensity;
        requestAnimationFrame(animateLight);
    }
    animateLight();
    
    return group;
}

// Dynamic lighting system
const lights = {
    ambient: new THREE.AmbientLight(0xffffff, 0.5),
    directional: new THREE.DirectionalLight(0xffffff, 0.8),
    point: new THREE.PointLight(0xffd700, 1, 50),
    spotlight: new THREE.SpotLight(0xffffff, 1)
};

lights.directional.position.set(5, 5, 5);
lights.point.position.set(0, 10, 0);
lights.spotlight.position.set(0, 20, 0);
lights.spotlight.angle = Math.PI / 6;
lights.spotlight.penumbra = 0.5;

Object.values(lights).forEach(light => scene.add(light));

// Day/night cycle
const dayNightCycle = {
    time: 0,
    duration: 120, // 2 minutes per cycle
    update: function(deltaTime) {
        this.time = (this.time + deltaTime) % this.duration;
        const cycle = (Math.sin(this.time / this.duration * Math.PI * 2) + 1) / 2;
        
        // Update sky color
        const skyColor = new THREE.Color();
        skyColor.setHSL(0.6, 0.8, 0.3 + cycle * 0.4);
        scene.background = skyColor;
        
        // Update fog if present
        if (scene.fog) {
            scene.fog.color = skyColor;
        }
        
        // Update lighting
        lights.ambient.intensity = 0.2 + cycle * 0.3;
        lights.directional.intensity = cycle * 0.8;
        
        // Update point light for night time glow
        lights.point.intensity = 1 - cycle;
        
        // Ground color adjustment
        ground.material.color.setHSL(0.3, 0.5, 0.2 + cycle * 0.4);
    }
};

// Particle system for environmental effects
class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 100;
    }
    
    createParticle(type) {
        const particle = {
            mesh: new THREE.Mesh(
                new THREE.SphereGeometry(0.1, 4, 4),
                new THREE.MeshBasicMaterial({
                    color: type === 'dust' ? 0xffffaa : 0xaaaaff,
                    transparent: true,
                    opacity: 0.6
                })
            ),
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
            ),
            lifetime: 3 + Math.random() * 2,
            type: type
        };
        
        particle.mesh.position.set(
            hamster.position.x + (Math.random() - 0.5) * 20,
            Math.random() * 20,
            hamster.position.z + (Math.random() - 0.5) * 20
        );
        
        scene.add(particle.mesh);
        this.particles.push(particle);
        
        if (this.particles.length > this.maxParticles) {
            const oldParticle = this.particles.shift();
            scene.remove(oldParticle.mesh);
        }
    }
    
    update(deltaTime) {
        // Add new particles
        if (Math.random() < 0.1) {
            this.createParticle(Math.random() < 0.7 ? 'dust' : 'sparkle');
        }
        
        // Update existing particles
        this.particles.forEach((particle, index) => {
            particle.lifetime -= deltaTime;
            
            if (particle.lifetime <= 0) {
                scene.remove(particle.mesh);
                this.particles.splice(index, 1);
                return;
            }
            
            // Update position
            particle.mesh.position.add(
                particle.velocity.clone().multiplyScalar(deltaTime)
            );
            
            // Update opacity
            particle.mesh.material.opacity = 
                Math.min(1, particle.lifetime) * 0.6;
            
            // Particle-specific behavior
            if (particle.type === 'sparkle') {
                particle.mesh.material.color.setHSL(
                    (Date.now() % 1000) / 1000,
                    1,
                    0.5
                );
            } else {
                particle.velocity.y += Math.sin(Date.now() * 0.001) * 0.1 * deltaTime;
            }
        });
    }
}

const particleSystem = new ParticleSystem();

// Add combo system functions
function updateCombo(deltaTime) {
    if (gameState.combo.count > 0) {
        gameState.combo.timer -= deltaTime;
        if (gameState.combo.timer <= 0) {
            resetCombo();
        }
    }
}

function incrementCombo(position) {
    const distance = position.distanceTo(gameState.combo.lastPosition);
    const isQuickAction = distance > 2; // Require some movement between actions
    
    if (isQuickAction) {
        gameState.combo.count++;
        gameState.combo.timer = gameState.combo.maxTime;
        gameState.combo.multiplier = Math.min(4, 1 + Math.floor(gameState.combo.count / 5));
        gameState.combo.lastPosition.copy(position);
        
        // Update combo text
        gameState.effects.comboText.textContent = `${gameState.combo.count}x COMBO!`;
        gameState.effects.comboText.style.opacity = '1';
        gameState.effects.comboText.style.fontSize = `${48 + gameState.combo.count * 2}px`;
        gameState.effects.comboFlash = 0.5;
        
        // Add visual effects based on combo level
        if (gameState.combo.count >= 10) {
            createComboEffect(position);
        }
    }
}

function resetCombo() {
    gameState.combo.count = 0;
    gameState.combo.timer = 0;
    gameState.combo.multiplier = 1;
    gameState.effects.comboText.style.opacity = '0';
}

function createComboEffect(position) {
    const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00];
    const numParticles = 20 + gameState.combo.count;
    
    for (let i = 0; i < numParticles; i++) {
        const particle = createRocketParticle();
        particle.material.color.setHex(colors[i % colors.length]);
        particle.position.copy(position);
        
        // Create spiral pattern
        const angle = (i / numParticles) * Math.PI * 2;
        const speed = 10 + gameState.combo.count * 0.5;
        particle.velocity.set(
            Math.cos(angle) * speed,
            speed * 0.5,
            Math.sin(angle) * speed
        );
        
        scene.add(particle);
        gameState.projectiles.push(particle);
    }
    
    // Add screen shake based on combo level
    gameState.effects.screenShake = Math.min(0.5, 0.1 + gameState.combo.count * 0.02);
    
    // Play combo sound
    const comboNote = 440 * Math.pow(2, gameState.combo.count / 12);
    playSound('collect', comboNote);
}

// Add score popup function
function showScorePopup(score, position) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.color = 'white';
    popup.style.fontSize = '24px';
    popup.style.fontWeight = 'bold';
    popup.style.textShadow = '0 0 5px #000';
    popup.style.pointerEvents = 'none';
    popup.textContent = `+${score}`;
    
    // Convert 3D position to screen coordinates
    const screenPosition = position.clone().project(camera);
    const x = (screenPosition.x + 1) * window.innerWidth / 2;
    const y = (-screenPosition.y + 1) * window.innerHeight / 2;
    
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    document.body.appendChild(popup);
    
    // Animate and remove
    let time = 0;
    function animate() {
        time += 0.016;
        popup.style.transform = `translateY(${-time * 100}px) scale(${1 + time * 0.5})`;
        popup.style.opacity = 1 - time;
        
        if (time < 1) {
            requestAnimationFrame(animate);
        } else {
            document.body.removeChild(popup);
        }
    }
    animate();
}

// Create bird obstacle
function createBird() {
    const bird = new THREE.Group();
    
    // Bird body
    const bodyGeometry = new THREE.ConeGeometry(0.3, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4444ff });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    bird.add(body);
    
    // Wings
    const wingGeometry = new THREE.PlaneGeometry(1, 0.5);
    const wingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2222ff,
        side: THREE.DoubleSide
    });
    
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
    leftWing.position.set(-0.5, 0, 0);
    bird.add(leftWing);
    
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
    rightWing.position.set(0.5, 0, 0);
    bird.add(rightWing);
    
    // Add animation properties
    bird.userData.wingAngle = 0;
    bird.userData.type = 'bird';
    bird.userData.health = 2;
    
    return bird;
}

// Create explosion effect
function createExplosion(position, color = 0xff4444) {
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1
            })
        );
        
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 10
        );
        particle.lifetime = 1 + Math.random();
        
        scene.add(particle);
        particles.push(particle);
    }
    
    // Add to game state for updating
    gameState.effects.explosions.push({
        particles: particles,
        time: 0
    });
}

// Create mountain for scenery
function createMountain(x, z, height) {
    const geometry = new THREE.ConeGeometry(height/2, height, 4);
    const material = new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8
    });
    const mountain = new THREE.Mesh(geometry, material);
    mountain.position.set(x, height/2, z);
    return mountain;
}

// Create tree for scenery
function createTree(x, z) {
    const tree = new THREE.Group();
    
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    tree.add(trunk);
    
    // Leaves
    const leavesGeometry = new THREE.ConeGeometry(1, 2, 6);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 2.5;
    tree.add(leaves);
    
    tree.position.set(x, 0, z);
    return tree;
}

// Add world update function
function updateWorld() {
    // Update cloud positions and rotations
    clouds.forEach((cloud, index) => {
        const speed = 0.2 + (index % 3) * 0.1;
        const amplitude = 0.5 + (index % 2) * 0.5;
        
        // Move clouds in a gentle wave pattern
        cloud.position.x += Math.sin(gameState.time * 0.001 * speed) * 0.01;
        cloud.position.y += Math.cos(gameState.time * 0.001 * speed) * 0.005;
        
        // Slowly rotate clouds
        cloud.rotation.y += 0.001 * speed;
        
        // Wrap clouds around when they move too far
        if (cloud.position.x > 50) cloud.position.x = -50;
        if (cloud.position.x < -50) cloud.position.x = 50;
    });
    
    // Update mountains and trees for parallax effect
    const parallaxSpeed = 0.1;
    gameState.scenery.mountains.forEach(mountain => {
        mountain.position.x += Math.sin(gameState.time * 0.0005) * parallaxSpeed * 0.2;
    });
    
    gameState.scenery.trees.forEach(tree => {
        // Make trees sway gently
        const swayAmount = 0.02;
        const swaySpeed = 0.001;
        tree.rotation.z = Math.sin(gameState.time * swaySpeed + tree.position.x) * swayAmount;
    });
    
    // Update birds
    gameState.birds.forEach(bird => {
        // Update wing animation
        bird.userData.wingAngle += gameState.deltaTime * 10;
        const wingRotation = Math.sin(bird.userData.wingAngle) * 0.5;
        
        // Apply wing rotation
        if (bird.children[1] && bird.children[2]) {
            bird.children[1].rotation.z = wingRotation; // Left wing
            bird.children[2].rotation.z = -wingRotation; // Right wing
        }
        
        // Bird movement pattern
        const time = gameState.time * 0.001;
        const radius = 10;
        const height = 5;
        
        // Calculate new position
        const newX = bird.userData.startPos ? 
            bird.userData.startPos.x + Math.sin(time) * radius : 
            bird.position.x;
        const newY = bird.userData.startPos ? 
            bird.userData.startPos.y + Math.cos(time * 0.5) * height : 
            bird.position.y;
        
        // Store initial position if not set
        if (!bird.userData.startPos) {
            bird.userData.startPos = bird.position.clone();
        }
        
        // Update position
        bird.position.x = newX;
        bird.position.y = newY;
        
        // Rotate bird based on movement direction
        const targetRotation = Math.atan2(
            bird.position.x - bird.userData.prevX,
            bird.position.z - bird.userData.prevZ
        );
        bird.rotation.y = targetRotation;
        
        // Store previous position for next frame
        bird.userData.prevX = bird.position.x;
        bird.userData.prevZ = bird.position.z;
    });
}

// Add bird update function
function updateBirds() {
    gameState.birds.forEach((bird, index) => {
        // Update wing animation
        bird.userData.wingAngle += gameState.deltaTime * 10;
        const wingRotation = Math.sin(bird.userData.wingAngle) * 0.5;
        
        // Apply wing rotation
        if (bird.children[1] && bird.children[2]) {
            bird.children[1].rotation.z = wingRotation; // Left wing
            bird.children[2].rotation.z = -wingRotation; // Right wing
        }
        
        // Bird movement pattern
        const time = gameState.time * 0.001;
        const radius = 10;
        const height = 5;
        const forwardSpeed = 2;
        
        // Calculate new position
        const newX = bird.userData.startPos ? 
            bird.userData.startPos.x + Math.sin(time + index) * radius : 
            bird.position.x;
        const newY = bird.userData.startPos ? 
            bird.userData.startPos.y + Math.cos(time * 0.5 + index) * height : 
            bird.position.y;
        const newZ = bird.position.z + forwardSpeed * gameState.deltaTime;
        
        // Store initial position if not set
        if (!bird.userData.startPos) {
            bird.userData.startPos = bird.position.clone();
        }
        
        // Update position
        bird.position.x = newX;
        bird.position.y = newY;
        bird.position.z = newZ;
        
        // Check for seed collisions
        gameState.projectiles.forEach((projectile, projectileIndex) => {
            if (!projectile.lifetime) { // Only check actual seeds, not particles
                if (projectile.position.distanceTo(bird.position) < 1) {
                    // Create hit effect
                    createExplosion(projectile.position, 0x4444ff);
                    
                    // Remove the projectile
                    scene.remove(projectile);
                    gameState.projectiles.splice(projectileIndex, 1);
                    
                    // Damage the bird
                    bird.userData.health--;
                    
                    // Visual feedback
                    bird.material.emissive = new THREE.Color(0xff0000);
                    setTimeout(() => {
                        if (bird.material) {
                            bird.material.emissive = new THREE.Color(0x000000);
                        }
                    }, 100);
                    
                    // If bird is defeated
                    if (bird.userData.health <= 0) {
                        // Create large explosion
                        createExplosion(bird.position, 0x4444ff);
                        
                        // Add score
                        const score = 500;
                        gameState.score += score;
                        showScorePopup(score, bird.position);
                        
                        // Remove bird
                        scene.remove(bird);
                        gameState.birds.splice(index, 1);
                        
                        // Play sound
                        playSound('hit');
                        
                        // Screen shake
                        gameState.effects.screenShake = 0.3;
                    }
                }
            }
        });
        
        // Update bird rotation based on movement
        const direction = new THREE.Vector3(
            bird.position.x - bird.userData.prevX,
            0,
            bird.position.z - bird.userData.prevZ
        ).normalize();
        
        if (direction.length() > 0) {
            const targetRotation = Math.atan2(direction.x, direction.z);
            bird.rotation.y = targetRotation;
        }
        
        // Store previous position for next frame
        bird.userData.prevX = bird.position.x;
        bird.userData.prevZ = bird.position.z;
    });
}

// Add explosion update function
function updateExplosions() {
    if (!gameState.effects.explosions) {
        gameState.effects.explosions = [];
    }

    // Update each explosion
    for (let i = gameState.effects.explosions.length - 1; i >= 0; i--) {
        const explosion = gameState.effects.explosions[i];
        explosion.time += gameState.deltaTime;
        
        // Update particles
        for (let j = explosion.particles.length - 1; j >= 0; j--) {
            const particle = explosion.particles[j];
            
            // Update lifetime
            particle.lifetime -= gameState.deltaTime;
            
            if (particle.lifetime <= 0) {
                scene.remove(particle);
                explosion.particles.splice(j, 1);
                continue;
            }
            
            // Update position
            particle.position.add(
                particle.velocity.clone().multiplyScalar(gameState.deltaTime)
            );
            
            // Update opacity
            particle.material.opacity = particle.lifetime;
            
            // Add gravity effect
            particle.velocity.y -= 9.8 * gameState.deltaTime;
        }
        
        // Remove explosion if all particles are gone
        if (explosion.particles.length === 0) {
            gameState.effects.explosions.splice(i, 1);
        }
    }
}