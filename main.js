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
    effects: {
        screenShake: 0,
        fadeOpacity: 0
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
    // ... existing initialization code ...

    // Start level-specific music
    const musicTracks = {
        1: MUSIC_TRACKS.TRAINING,
        2: MUSIC_TRACKS.CLOUD_CITY,
        3: MUSIC_TRACKS.SUNSET
    };
    playBackgroundMusic(musicTracks[levelManager.currentLevel]);
}

// Update game loop to handle moving obstacles
function updateObstacles(currentTime) {
    gameState.obstacles.forEach(obstacle => {
        if (obstacle.userData.moving) {
            obstacle.userData.time += gameState.deltaTime;
            const t = obstacle.userData.time * obstacle.userData.speed;
            
            // Create a circular motion
            const radius = 5;
            const x = obstacle.userData.startPos.x + Math.cos(t) * radius;
            const z = obstacle.userData.startPos.z + Math.sin(t) * radius;
            
            obstacle.position.x = x;
            obstacle.position.z = z;
            
            // Update bounding box
            obstacle.userData.boundingBox.setFromObject(obstacle);
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

    // Update hamster position based on input
    const moveSpeed = gameState.player.speed * gameState.deltaTime;
    
    // Apply movement
    if (gameState.keys.forward) hamster.position.z -= moveSpeed;
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
            gameState.score += 100;
            gameState.player.seeds = Math.min(gameState.player.maxSeeds, gameState.player.seeds + 3);
            
            playSound('collect');
            gameState.effects.screenShake = 0.1;
            
            // Flash overlay
            overlayElement.style.backgroundColor = 'rgba(255, 215, 0, 0.2)';
            setTimeout(() => {
                overlayElement.style.backgroundColor = 'transparent';
            }, 100);
            
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

    // Only render if not in start state
    if (gameState.state !== 'start') {
        renderer.render(scene, camera);
    }

    requestAnimationFrame(gameLoop);
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