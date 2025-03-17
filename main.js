// Game state
const gameState = {
    time: 0,
    deltaTime: 0,
    score: 0,
    state: 'start', // start, playing, paused, gameover
    keys: {
        forward: false,
        backward: false,
        left: false,
        right: false,
        space: false,
        shift: false // For rocket boost
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
    canvas: document.getElementById('game-canvas'),
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
            hit: { freq: 100, duration: 0.3, volume: 0.4 }
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

// Initialize audio context and sounds on user interaction
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

// Initialize level elements
function initializeLevelElements() {
    // Clear existing elements
    gameState.collectibles.forEach(c => scene.remove(c));
    gameState.obstacles.forEach(o => scene.remove(o));
    gameState.collectibles.length = 0;
    gameState.obstacles.length = 0;
    
    // Add collectible seeds in a pattern
    for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const radius = 8;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const seed = createCollectibleSeed(x, 3, z);
        gameState.collectibles.push(seed);
        scene.add(seed);
    }
    
    // Add obstacles in strategic positions
    const obstaclePositions = [
        { x: 5, y: 0, z: 5, w: 1, h: 3, d: 1 },
        { x: -5, y: 0, z: -5, w: 1, h: 2, d: 1 },
        { x: 5, y: 0, z: -5, w: 1, h: 4, d: 1 },
        { x: -5, y: 0, z: 5, w: 1, h: 2.5, d: 1 }
    ];
    
    obstaclePositions.forEach(pos => {
        const obstacle = createObstacle(pos.x, pos.y, pos.z, pos.w, pos.h, pos.d);
        gameState.obstacles.push(obstacle);
        scene.add(obstacle);
    });
}

// Create score display
const scoreElement = document.createElement('div');
scoreElement.style.position = 'absolute';
scoreElement.style.top = '20px';
scoreElement.style.left = '20px';
scoreElement.style.color = 'white';
scoreElement.style.fontSize = '24px';
scoreElement.style.fontFamily = 'Arial, sans-serif';
scoreElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
document.body.appendChild(scoreElement);

// Create resource display
const resourceElement = document.createElement('div');
resourceElement.style.position = 'absolute';
resourceElement.style.top = '60px';
resourceElement.style.left = '20px';
resourceElement.style.color = 'white';
resourceElement.style.fontSize = '18px';
resourceElement.style.fontFamily = 'Arial, sans-serif';
resourceElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
document.body.appendChild(resourceElement);

// Update UI elements
function updateUI() {
    scoreElement.textContent = `Score: ${gameState.score}`;
    resourceElement.textContent = `Fuel: ${Math.round(gameState.player.fuel)}% | Seeds: ${gameState.player.seeds}`;
}

// Create visual effects overlay
const overlayElement = document.createElement('div');
overlayElement.style.position = 'absolute';
overlayElement.style.top = '0';
overlayElement.style.left = '0';
overlayElement.style.width = '100%';
overlayElement.style.height = '100%';
overlayElement.style.pointerEvents = 'none';
overlayElement.style.transition = 'background-color 0.3s';
document.body.appendChild(overlayElement);

// Create pause menu
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
pauseMenu.innerHTML = `
    <h2 style="color: white; margin-bottom: 20px;">Game Paused</h2>
    <button id="resumeButton" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Resume</button>
    <button id="restartButton" style="padding: 10px 20px; margin: 5px; cursor: pointer;">Restart</button>
`;
document.body.appendChild(pauseMenu);

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

// Reset game function
function resetGame() {
    gameState.score = 0;
    gameState.player.fuel = gameState.player.maxFuel;
    gameState.player.seeds = gameState.player.maxSeeds;
    hamster.position.set(0, 2, 0);
    gameState.player.velocity.set(0, 0, 0);
    initializeLevelElements();
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

// Modify game loop to include effects and state management
function gameLoop(currentTime) {
    // Skip updates if paused
    if (gameState.state === 'paused') {
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

    // Update UI
    updateUI();

    // Only render and update if not in start state
    if (gameState.state !== 'start') {
        renderer.render(scene, camera);
    }

    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Initialize level elements but don't start game loop until user clicks start
initializeLevelElements();

// Start game loop
requestAnimationFrame(gameLoop);

// Log initialization success
console.log('Three.js scene initialized successfully with clouds'); 