// Import Three.js and required components
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

// Import level system, power-ups, and achievements
import { LevelManager, LEVELS } from './levels.js';
import { PowerUpManager, POWERUP_TYPES } from './powerups.js';
import { AchievementManager } from './achievements.js';
import { TerrainManager } from './terrain.js';
import { CloudManager } from './clouds.js';

// Logger utility
const Logger = {
    DEBUG: true,
    
    log: function(category, message, data = null) {
        if (!this.DEBUG) return;
        
        const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
        const logMessage = `[${timestamp}] [${category}] ${message}`;
        
        if (data) {
            console.log(logMessage, data);
        } else {
            console.log(logMessage);
        }
    },
    
    powerup: function(message, data = null) {
        this.log('POWERUP', message, data);
    },
    
    fox: function(message, data = null) {
        this.log('FOX', message, data);
    },
    
    game: function(message, data = null) {
        this.log('GAME', message, data);
    }
};

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
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.margin = '0';
canvas.style.padding = '0';
canvas.style.display = 'block';
document.body.style.margin = '0';
document.body.style.padding = '0';
document.body.style.overflow = 'hidden';
document.body.appendChild(canvas);

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Add fog with increased density and better blending
scene.fog = new THREE.FogExp2(0x87CEEB, 0.015); // Increased fog density

// Camera setup with adjusted FOV and far plane
const camera = new THREE.PerspectiveCamera(
    60, // Reduced FOV for less distortion
    window.innerWidth / window.innerHeight,
    0.1,
    300 // Reduced far plane to match fog
);

// Adjust initial camera position
camera.position.set(0, 5, 12);
camera.lookAt(0, 0, 0);

// Renderer setup
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Basic lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Increased ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased directional light
directionalLight.position.set(5, 10, 5); // Adjusted light position
scene.add(directionalLight);

// Initialize managers
const terrainManager = new TerrainManager(scene);
const cloudManager = new CloudManager(scene);

// Initialize sound effects
const sounds = {
    hit: new Audio('sounds/hit.mp3'),
    shoot: new Audio('sounds/shoot.mp3'),
    jump: new Audio('sounds/jump.mp3')
};

// Note: playSound function is defined later in the file with full audio context implementation

// Initialize game state
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
        health: 100,
        maxHealth: 100,
        damageFlashTime: 0,
        velocity: new THREE.Vector3(),
        speed: 10,
        jumpForce: 15,
        gravity: 30,
        fuel: 100,
        maxFuel: 100,
        fuelRegenRate: 20,
        boostForce: 20,
        seeds: 1000,              // Changed from 10 to 1000
        maxSeeds: 1000,          // Changed from 10 to 1000
        seedReloadTime: 0.1,     // Decreased reload time for better usability
        lastSeedTime: 0,
        isInvulnerable: false,
        invulnerableTime: 0,
        flashTime: 0,
        isJumping: false,
        jumpTime: 0,
        maxJumpTime: 0.5,
        baseJumpForce: 4,
        maxJumpForce: 15,
        fallGravity: 20,
        rocketParticleRate: 0.05
    },
    enemies: [], // Initialize empty enemies array
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
        maxTime: 2.0,
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
        new THREE.SphereGeometry(0.1, 4, 4),  // Doubled particle size
        new THREE.MeshBasicMaterial({ 
            color: 0xFF4400,
            transparent: true,
            opacity: 0.8
        })
    );
    particle.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,  // Doubled spread range
        -Math.random() * 6,         // Increased downward velocity
        (Math.random() - 0.5) * 4   // Doubled spread range
    );
    particle.lifetime = 0.8;  // Increased lifetime
    return particle;
}

// Modify createHamster to add multiple rocket exhaust points
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

    // Add multiple rocket exhaust points
    const exhaustPoints = new THREE.Group();
    const numPoints = 3;  // Three exhaust points
    for (let i = 0; i < numPoints; i++) {
        const point = new THREE.Object3D();
        point.position.set(
            (i - 1) * 0.15,  // Spread points horizontally
            -0.3,
            -0.4
        );
        exhaustPoints.add(point);
    }
    body.add(exhaustPoints);
    body.exhaustPoints = exhaustPoints;

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

// Modify handleClick function to standardize timing
function handleClick(event) {
    if (gameState.state !== 'playing') {
        Logger.game('Shooting blocked - game not in playing state', {
            currentState: gameState.state
        });
        return;
    }
    
    Logger.game('Shoot attempt', {
        seeds: gameState.player.seeds,
        timeSinceLastShot: (gameState.time - gameState.player.lastSeedTime) / 1000,
        reloadTime: gameState.player.seedReloadTime
    });
    
    if (gameState.player.seeds > 0) {
        if ((gameState.time - gameState.player.lastSeedTime) / 1000 > gameState.player.seedReloadTime) {
            // Create multiple seeds in a spread pattern
            const numSeeds = 5;  // Keep spread pattern
            const spreadAngle = Math.PI / 4;
            
            Logger.game('Creating spread shot', {
                numSeeds,
                spreadAngle,
                position: {
                    x: hamster.position.x.toFixed(2),
                    y: hamster.position.y.toFixed(2),
                    z: hamster.position.z.toFixed(2)
                }
            });
            
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
                
                Logger.game('Seed created', {
                    index: i,
                    angle: angle.toFixed(2),
                    velocity: {
                        x: seed.velocity.x.toFixed(2),
                        y: seed.velocity.y.toFixed(2),
                        z: seed.velocity.z.toFixed(2)
                    }
                });
            }
            
            playSound('shoot');
            
            gameState.player.seeds--;
            gameState.player.lastSeedTime = gameState.time;
            
            Logger.game('Shot completed', {
                remainingSeeds: gameState.player.seeds,
                nextReloadTime: gameState.player.lastSeedTime + (gameState.player.seedReloadTime * 1000)
            });
        } else {
            Logger.game('Shot blocked - still reloading', {
                timeRemaining: (gameState.player.seedReloadTime - ((gameState.time - gameState.player.lastSeedTime) / 1000)).toFixed(2)
            });
        }
    } else {
        Logger.game('Shot blocked - no seeds remaining');
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
        roughness: 0.3,
        emissive: 0xFFD700, // Add glow
        emissiveIntensity: 0.5
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
    
    // Set position closer to ground
    const groundHeight = terrainManager.getHeight(x, z);
    seed.position.set(x, groundHeight + 1, z); // Reduced from +2 to +1
    seed.userData.type = 'collectible';
    seed.userData.baseY = groundHeight + 1; // Update base Y to match new height
    seed.userData.rotationSpeed = 1 + Math.random(); // Random rotation speed
    seed.userData.floatOffset = Math.random() * Math.PI * 2; // Random float offset
    
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
    <button id="nextLevelButton" style="
    padding: 10px 20px; margin: 0 auto; cursor: pointer;">Next Level</button>
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

// Create life bar
const lifeBarContainer = document.createElement('div');
lifeBarContainer.style.width = '200px';
lifeBarContainer.style.height = '20px';
lifeBarContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
lifeBarContainer.style.border = '2px solid white';
lifeBarContainer.style.borderRadius = '10px';
lifeBarContainer.style.overflow = 'hidden';
lifeBarContainer.style.marginBottom = '10px';

const lifeBar = document.createElement('div');
lifeBar.style.width = '100%';
lifeBar.style.height = '100%';
lifeBar.style.backgroundColor = '#ff3333';
lifeBar.style.transition = 'width 0.3s ease-out';

lifeBarContainer.appendChild(lifeBar);
uiContainer.appendChild(lifeBarContainer);

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
overlayElement.style.zIndex = '1000';
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
    terrainManager.setGroundColor(currentLevel.environment.groundColor);
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

    // Update life bar
    lifeBar.style.width = `${(gameState.player.health / gameState.player.maxHealth) * 100}%`;
    
    // Change life bar color based on health
    if (gameState.player.health > 60) {
        lifeBar.style.backgroundColor = '#33ff33';
    } else if (gameState.player.health > 30) {
        lifeBar.style.backgroundColor = '#ffff33';
    } else {
        lifeBar.style.backgroundColor = '#ff3333';
    }

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
    Logger.game('Resetting game...');
    
    // Reset game state
    gameState.score = 0;
    gameState.player.health = gameState.player.maxHealth;
    gameState.player.fuel = gameState.player.maxFuel;
    gameState.player.seeds = gameState.player.maxSeeds;
    gameState.player.isInvulnerable = false;
    gameState.player.damageFlashTime = 0;
    
    // Reset hamster
    hamster.position.set(0, 2, 0);
    hamster.visible = true;
    gameState.player.velocity.set(0, 0, 0);
    
    // Clear existing entities
    Logger.game('Clearing existing entities...');
    gameState.enemies.forEach(enemy => scene.remove(enemy));
    gameState.enemies.length = 0;
    gameState.projectiles.forEach(proj => scene.remove(proj));
    gameState.projectiles.length = 0;
    
    // Clear and reinitialize world elements
    cloudManager.dispose();
    terrainManager.reset();
    
    // Spawn initial foxes around the player
    Logger.game('Spawning initial foxes...');
    const numInitialFoxes = 5;
    for (let i = 0; i < numInitialFoxes; i++) {
        const fox = createFox();
        
        // Position foxes in a circle around the player
        const angle = (i / numInitialFoxes) * Math.PI * 2;
        const radius = 20; // Distance from player
        
        const foxX = Math.cos(angle) * radius;
        const foxZ = Math.sin(angle) * radius;
        
        fox.position.set(foxX, 0, foxZ);
        
        // Ensure fox is above ground
        const groundHeight = terrainManager.getHeight(fox.position.x, fox.position.z);
        fox.position.y = groundHeight + 1;
        
        Logger.fox('Spawned initial fox', {
            index: i,
            position: {
                x: fox.position.x.toFixed(2),
                y: fox.position.y.toFixed(2),
                z: fox.position.z.toFixed(2)
            }
        });
        
        scene.add(fox);
        gameState.enemies.push(fox);
    }
    
    // Spawn initial power-ups around the player
    Logger.game('Spawning initial power-ups');
    const numInitialPowerUps = 3;
    for (let i = 0; i < numInitialPowerUps; i++) {
        const powerUpTypes = [POWERUP_TYPES.BOMB, POWERUP_TYPES.STAR, POWERUP_TYPES.CARROT];
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        // Position in a circle around the player
        const angle = (i / numInitialPowerUps) * Math.PI * 2;
        const radius = 10; // Close to player
        
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = terrainManager.getHeight(x, z) + 1; // Reduced from +2 to +1
        
        const powerUpMesh = createPowerUpMesh(randomType);
        powerUpMesh.position.set(x, y, z);
        scene.add(powerUpMesh);
        
        powerUpManager.powerUpPool.push({
            type: randomType,
            position: powerUpMesh.position,
            mesh: powerUpMesh,
            collected: false
        });
        
        Logger.powerup('Spawned initial power-up', {
            type: randomType.name,
            position: { x, y, z },
            index: i
        });
    }
    
    // Initialize level elements
    initializeLevelElements();
    achievementManager.startLevel();
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
        terrainManager.setGroundColor(new THREE.Color().setHSL(0.3, 0.5, 0.2 + cycle * 0.4));
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
    cloudManager.clouds.forEach((cloud, index) => {
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

// Update terrain chunks based on player position
terrainManager.update(hamster.position);

// Update clouds
cloudManager.update(hamster.position, gameState.deltaTime);

// Check if hamster is on the ground
const isOnGround = Math.abs(hamster.position.y - terrainManager.getHeight(hamster.position.x, hamster.position.z)) < 0.1;

// Create fox enemy
function createFox() {
    console.log('Creating new fox...');
    const fox = new THREE.Group();
    
    // Body - Made larger and more visible
    const bodyGeometry = new THREE.BoxGeometry(1.5, 1, 2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff3300,  // Brighter orange
        emissive: 0xff3300,
        emissiveIntensity: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    fox.add(body);
    
    // Head - Made larger
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 0.3
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.z = 1;
    head.position.y = 0.3;
    fox.add(head);
    
    // Ears - Made more prominent
    const earGeometry = new THREE.ConeGeometry(0.3, 0.6, 4);
    const earMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff3300,
        emissive: 0xff3300,
        emissiveIntensity: 0.3
    });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(0.3, 0.8, 1);
    fox.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(-0.3, 0.8, 1);
    fox.add(rightEar);
    
    // Add glow effect
    const glowGeometry = new THREE.BoxGeometry(1.7, 1.2, 2.2);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff3300,
        transparent: true,
        opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    fox.add(glow);
    
    // Less aggressive properties
    fox.userData.type = 'fox';
    fox.userData.health = 1; // One hit to destroy
    fox.userData.shootTimer = 0;
    fox.userData.shootInterval = 2; // Shoot less frequently
    fox.userData.moveSpeed = 6; // Move slower
    fox.userData.state = 'chase';
    fox.userData.chaseDistance = 40; // Stay further away
    fox.userData.retreatDistance = 15; // Retreat sooner
    
    console.log('Fox created successfully:', {
        type: fox.userData.type,
        health: fox.userData.health,
        interval: fox.userData.shootInterval,
        speed: fox.userData.moveSpeed,
        children: fox.children.length
    });
    
    return fox;
}

// Create fox bullet
function createFoxBullet(position, direction) {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    const bullet = new THREE.Mesh(geometry, material);
    bullet.position.copy(position);
    
    // Add trail effect
    const trail = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 8, 8),
        new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.6
        })
    );
    bullet.add(trail);
    
    bullet.velocity = direction.normalize().multiplyScalar(30);
    bullet.userData.type = 'foxBullet';
    bullet.userData.damage = 10;
    
    return bullet;
}

// Add fox update function
function updateFoxes() {
    if (gameState.enemies.length === 0) {
        console.log('No foxes to update');
        return;
    }
    
    console.log(`Updating ${gameState.enemies.length} foxes...`);
    
    // Update foxes and check for seed collisions
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        const fox = gameState.enemies[i];
        if (fox.userData.type !== 'fox') {
            console.warn('Non-fox enemy found:', fox.userData.type);
            continue;
        }
        
        // Check for seed collisions first
        for (let j = gameState.projectiles.length - 1; j >= 0; j--) {
            const projectile = gameState.projectiles[j];
            // Only check actual seeds (not particles or fox bullets)
            if (!projectile.lifetime && !projectile.userData.type) {
                if (projectile.position.distanceTo(fox.position) < 1.5) {
                    // Remove the fox immediately
                    scene.remove(fox);
                    gameState.enemies.splice(i, 1);
                    
                    // Remove the seed
                    scene.remove(projectile);
                    gameState.projectiles.splice(j, 1);
                    
                    // Create explosion effect
                    createExplosion(fox.position, 0xff3300);
                    
                    // Add score
                    const score = 200;
                    gameState.score += score;
                    showScorePopup(score, fox.position);
                    
                    // Play sound
                    playSound('hit');
                    
                    // Return to skip rest of fox update
                    return;
                }
            }
        }
        
        // Update shoot timer
        fox.userData.shootTimer += gameState.deltaTime;
        
        // Calculate distance to player
        const distanceToPlayer = fox.position.distanceTo(hamster.position);
        
        // Debug fox state
        if (i === 0) { // Only log first fox to avoid spam
            console.log('Fox status:', {
                index: i,
                position: {
                    x: fox.position.x.toFixed(2),
                    y: fox.position.y.toFixed(2),
                    z: fox.position.z.toFixed(2)
                },
                distanceToPlayer: distanceToPlayer.toFixed(2),
                state: fox.userData.state,
                shootTimer: fox.userData.shootTimer.toFixed(2)
            });
        }
        
        // Update state based on distance
        if (distanceToPlayer < fox.userData.retreatDistance) {
            fox.userData.state = 'retreat';
        } else if (distanceToPlayer > fox.userData.chaseDistance) {
            fox.userData.state = 'chase';
        }
        
        // Move based on state
        const direction = new THREE.Vector3()
            .subVectors(hamster.position, fox.position)
            .normalize();
        
        if (fox.userData.state === 'retreat') {
            fox.position.sub(direction.multiplyScalar(fox.userData.moveSpeed * gameState.deltaTime));
        } else {
            fox.position.add(direction.multiplyScalar(fox.userData.moveSpeed * gameState.deltaTime));
        }
        
        // Keep fox at proper height
        fox.position.y = terrainManager.getHeight(fox.position.x, fox.position.z) + 1;
        
        // Rotate to face player
        fox.lookAt(hamster.position);
        
        // Shooting logic - now only shoots one bullet at a time
        if (fox.userData.shootTimer >= fox.userData.shootInterval) {
            fox.userData.shootTimer = 0;
            
            const bulletPosition = fox.position.clone();
            bulletPosition.y += 0.5;
            
            const bulletDirection = new THREE.Vector3()
                .subVectors(hamster.position, bulletPosition)
                .normalize();
            
            const bullet = createFoxBullet(bulletPosition, bulletDirection);
            scene.add(bullet);
            gameState.projectiles.push(bullet);
            
            // Play shoot sound
            playSound('shoot');
        }
    }
}

function takeDamage(amount) {
    if (gameState.player.isInvulnerable) return;
    
    gameState.player.health = Math.max(0, gameState.player.health - amount);
    gameState.player.isInvulnerable = true;
    gameState.player.invulnerableTime = 1.5;
    gameState.player.damageFlashTime = 0.3;
    
    // Visual effects
    gameState.effects.screenShake = 0.3;
    overlayElement.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
    setTimeout(() => {
        overlayElement.style.backgroundColor = 'transparent';
    }, 100);
    
    // Sound effect
    playSound('hit');
    
    // Create damage particles
    for (let i = 0; i < 10; i++) {
        const particle = createRocketParticle();
        particle.material.color.setHex(0xff0000);
        particle.position.copy(hamster.position);
        particle.velocity.set(
            (Math.random() - 0.5) * 10,
            Math.random() * 10,
            (Math.random() - 0.5) * 10
        );
        scene.add(particle);
        gameState.projectiles.push(particle);
    }
    
    // Check for game over
    if (gameState.player.health <= 0) {
        gameState.state = 'gameover';
        gameOverScreen.style.display = 'block';
        document.getElementById('gameOverScore').textContent = gameState.score;
        
        // Create final explosion effect
        createExplosion(hamster.position, 0xff0000);
        playSound('hit');
        
        // Hide hamster
        hamster.visible = false;
    }
}

// Create game over screen
const gameOverScreen = document.createElement('div');
gameOverScreen.style.position = 'absolute';
gameOverScreen.style.top = '50%';
gameOverScreen.style.left = '50%';
gameOverScreen.style.transform = 'translate(-50%, -50%)';
gameOverScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
gameOverScreen.style.padding = '20px';
gameOverScreen.style.borderRadius = '10px';
gameOverScreen.style.display = 'none';
gameOverScreen.style.textAlign = 'center';
gameOverScreen.style.zIndex = '1000';
gameOverScreen.innerHTML = `
    <h2 style="color: white; margin-bottom: 20px;">Game Over!</h2>
    <p style="color: white; margin-bottom: 20px;">Final Score: <span id="gameOverScore">0</span></p>
    <button id="returnHomeButton" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Return to Home</button>
    <button id="retryButton" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Try Again</button>
`;
document.body.appendChild(gameOverScreen);

// Add event listeners for game over buttons
document.getElementById('returnHomeButton').addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    startScreen.style.display = 'block';
    gameState.state = 'start';
});

document.getElementById('retryButton').addEventListener('click', () => {
    gameOverScreen.style.display = 'none';
    resetGame();
    gameState.state = 'playing';
});

function generateNewWorldChunk() {
    const chunkSize = gameState.scenery.generationDistance;
    
    Logger.game('Generating new world chunk', {
        chunkSize: chunkSize,
        newZ: gameState.scenery.lastGeneratedPosition - chunkSize
    });
    
    const newZ = gameState.scenery.lastGeneratedPosition - chunkSize;
    
    // Spawn power-ups with 80% chance per chunk (increased from 20%)
    if (Math.random() < 0.8) {
        const powerUpTypes = [POWERUP_TYPES.BOMB, POWERUP_TYPES.STAR, POWERUP_TYPES.CARROT];
        const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
        
        // Position power-ups closer to the player's path and lower to the ground
        const x = (Math.random() - 0.5) * 10; // Reduced from 20 to 10 for easier access
        const z = newZ + (Math.random() - 0.5) * 10; // Reduced from 20 to 10
        const y = terrainManager.getHeight(x, z) + 1; // Reduced from +2 to +1
        
        const powerUpMesh = createPowerUpMesh(randomType);
        powerUpMesh.position.set(x, y, z);
        scene.add(powerUpMesh);
        
        powerUpManager.powerUpPool.push({
            type: randomType,
            position: powerUpMesh.position,
            mesh: powerUpMesh,
            collected: false
        });
        
        Logger.powerup('Spawned power-up', {
            type: randomType.name,
            position: { x, y, z },
            totalPowerUps: powerUpManager.powerUpPool.length
        });
    }
    
    // Update the last generated position
    gameState.scenery.lastGeneratedPosition = newZ;
}

// Inside gameLoop function, update the power-up collection check
// ... existing code ...

// Check power-up collection
powerUpManager.powerUpPool.forEach((powerUp, index) => {
    if (!powerUp.collected && powerUp.mesh && 
        hamster.position.distanceTo(powerUp.position) < 1.5) {
        
        Logger.powerup('Power-up collected', {
            type: powerUp.type.name,
            position: powerUp.position,
            playerPos: hamster.position,
            remainingPowerUps: powerUpManager.powerUpPool.length - 1
        });
        
        powerUp.collected = true;
        powerUp.mesh.visible = false;
        scene.remove(powerUp.mesh);
        
        // Activate power-up with game state context
        powerUp.type.effect(gameState.player, {
            scene: scene,
            enemies: gameState.enemies,
            score: gameState.score,
            effects: gameState.effects,
            projectiles: gameState.projectiles,
            time: gameState.time
        });
        
        // Visual and sound effects
        createExplosion(powerUp.position, powerUp.type.color);
        playSound('collect');
        
        // Screen effects
        gameState.effects.screenShake = 0.2;
        overlayElement.style.backgroundColor = `rgba(${powerUp.type.color.toString(16)}, 0.2)`;
        setTimeout(() => {
            overlayElement.style.backgroundColor = 'transparent';
        }, 100);
        
        // Remove from pool
        powerUpManager.powerUpPool.splice(index, 1);
        
        Logger.powerup('Power-up effect activated', {
            type: powerUp.type.name,
            remainingPowerUps: powerUpManager.powerUpPool.length
        });
    }
});

// ... existing code ...

// Add game loop function
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

    // Update foxes
    updateFoxes();

    // Update hamster position based on input
    const moveSpeed = gameState.player.speed * gameState.deltaTime;
    
    // Update vertical position and ground collision
    hamster.position.y += gameState.player.velocity.y * gameState.deltaTime;

    // Get terrain height at player position and check if on ground
    const groundHeight = terrainManager.getHeight(hamster.position.x, hamster.position.z) + 1;
    const isOnGround = hamster.position.y <= groundHeight;

    // Ground collision
    if (hamster.position.y < groundHeight) {
        hamster.position.y = groundHeight;
        gameState.player.velocity.y = 0;
        gameState.player.isJumping = false;
    }

    // Apply gravity and jumping
    if (gameState.keys.space && isOnGround) {
        gameState.player.velocity.y = gameState.player.jumpForce;
        gameState.player.isJumping = true;
        playSound('jump');

        // Add rocket particles when jumping
        hamster.exhaustPoints.children.forEach(exhaustPoint => {
            const particle = createRocketParticle();
            const worldPos = new THREE.Vector3();
            exhaustPoint.getWorldPosition(worldPos);
            particle.position.copy(worldPos);
            scene.add(particle);
            gameState.projectiles.push(particle);
        });
    } else {
        // Apply gravity
        gameState.player.velocity.y -= gameState.player.gravity * gameState.deltaTime;
    }

    // Prevent going through mountains - add horizontal collision detection
    const nextX = hamster.position.x + (gameState.keys.right ? moveSpeed : (gameState.keys.left ? -moveSpeed : 0));
    const nextZ = hamster.position.z + (gameState.keys.backward ? moveSpeed : (gameState.keys.forward ? -moveSpeed : 0));
    
    const nextGroundHeight = terrainManager.getHeight(nextX, nextZ) + 1;
    const heightDifference = nextGroundHeight - groundHeight;

    // Only allow movement if height difference is not too steep
    if (Math.abs(heightDifference) < 2) {
        if (gameState.keys.forward) hamster.position.z -= moveSpeed;
        if (gameState.keys.backward) hamster.position.z += moveSpeed;
        if (gameState.keys.left) hamster.position.x -= moveSpeed;
        if (gameState.keys.right) hamster.position.x += moveSpeed;
    }

    // Update camera to follow hamster with adjusted positioning
    camera.position.x = hamster.position.x;
    camera.position.y = hamster.position.y + 4; // Reduced height
    camera.position.z = hamster.position.z + 10; // Reduced distance
    camera.lookAt(
        hamster.position.x,
        hamster.position.y + 1, // Look slightly above hamster
        hamster.position.z
    );

    // Update terrain based on player position
    terrainManager.update(hamster.position);

    // Generate new world elements when player moves forward
    if (hamster.position.z < gameState.worldPosition - 50) {
        gameState.worldPosition = Math.floor(hamster.position.z / 50) * 50;
        generateNewWorldChunk();
    }

    // Update projectiles and check collisions
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
        } else if (projectile.userData.type === 'foxBullet') {
            // Fox bullet update
            projectile.position.add(
                projectile.velocity.clone().multiplyScalar(gameState.deltaTime)
            );
            
            // Check collision with player
            if (!gameState.player.isInvulnerable && 
                projectile.position.distanceTo(hamster.position) < 1) {
                takeDamage(projectile.userData.damage);
                scene.remove(projectile);
                gameState.projectiles.splice(i, 1);
                continue;
            }
            
            // Remove bullets that go too far
            if (projectile.position.distanceTo(hamster.position) > 50) {
                scene.remove(projectile);
                gameState.projectiles.splice(i, 1);
                continue;
            }
        } else {
            // Seed update
            projectile.velocity.y -= gameState.player.gravity * 1.5 * gameState.deltaTime;
            projectile.rotation.x += 5 * gameState.deltaTime;
            projectile.rotation.z += 3 * gameState.deltaTime;
        }
        
        projectile.position.add(
            projectile.velocity.clone().multiplyScalar(gameState.deltaTime)
        );

        // Remove projectiles that fall below ground
        if (projectile.position.y < 0) {
            scene.remove(projectile);
            gameState.projectiles.splice(i, 1);
        }
    }

    // Update damage flash effect
    if (gameState.player.damageFlashTime > 0) {
        gameState.player.damageFlashTime -= gameState.deltaTime;
        const flashIntensity = Math.sin(gameState.player.damageFlashTime * 20) * 0.5 + 0.5;
        hamster.traverse(child => {
            if (child.material) {
                child.material.emissive = new THREE.Color(flashIntensity, 0, 0);
            }
        });
    } else {
        hamster.traverse(child => {
            if (child.material) {
                child.material.emissive = new THREE.Color(0, 0, 0);
            }
        });
    }

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
            hamster.exhaustPoints.children.forEach(exhaustPoint => {
                const particle = createRocketParticle();
                const worldPos = new THREE.Vector3();
                exhaustPoint.getWorldPosition(worldPos);
                particle.position.copy(worldPos);
                scene.add(particle);
                gameState.projectiles.push(particle);
            });
        }
    }

    // Update power-ups
    powerUpManager.updatePowerUps(gameState.deltaTime, currentTime);
    
    // Check power-up collection
    powerUpManager.powerUpPool.forEach((powerUp, index) => {
        if (!powerUp.collected && powerUp.mesh && 
            hamster.position.distanceTo(powerUp.position) < 1.5) {
            
            Logger.powerup('Power-up collected', {
                type: powerUp.type.name,
                position: powerUp.position,
                playerPos: hamster.position,
                remainingPowerUps: powerUpManager.powerUpPool.length - 1
            });
            
            powerUp.collected = true;
            powerUp.mesh.visible = false;
            scene.remove(powerUp.mesh);
            
            // Activate power-up
            powerUp.type.effect(gameState.player, {
                scene: scene,
                enemies: gameState.enemies,
                score: gameState.score,
                effects: gameState.effects,
                projectiles: gameState.projectiles,
                time: gameState.time
            });
            
            // Effects
            createExplosion(powerUp.position, powerUp.type.color);
            playSound('collect');
            gameState.effects.screenShake = 0.2;
            
            powerUpManager.powerUpPool.splice(index, 1);
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

    // Update obstacles
    updateObstacles(currentTime);

    // Check for level completion
    checkLevelComplete();

    // Update UI
    updateUI();

    // Update day/night cycle
    dayNightCycle.update(gameState.deltaTime);
    
    // Update particle system
    particleSystem.update(gameState.deltaTime);
    
    // Update combo system
    updateCombo(gameState.deltaTime);

    // Check collectible seed (coin) collection
    for (let i = gameState.collectibles.length - 1; i >= 0; i--) {
        const coin = gameState.collectibles[i];
        if (hamster.position.distanceTo(coin.position) < 1.5) {
            // Add score
            const coinScore = 100;
            gameState.score += coinScore;
            
            // Create collection effect
            createExplosion(coin.position, 0xFFD700); // Gold color explosion
            
            // Show score popup
            showScorePopup(coinScore, coin.position);
            
            // Play collection sound
            playSound('collect');
            
            // Remove coin
            scene.remove(coin);
            gameState.collectibles.splice(i, 1);
            
            // Increment combo
            incrementCombo(hamster.position);
            
            Logger.game('Coin collected', {
                score: coinScore,
                totalScore: gameState.score,
                position: {
                    x: coin.position.x.toFixed(2),
                    y: coin.position.y.toFixed(2),
                    z: coin.position.z.toFixed(2)
                },
                remainingCoins: gameState.collectibles.length
            });
        }
    }

    // Only render if not in start state
    if (gameState.state !== 'start') {
        renderer.render(scene, camera);
    }

    requestAnimationFrame(gameLoop);
}

// ... existing code ...