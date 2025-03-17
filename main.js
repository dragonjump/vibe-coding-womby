// Game state
const gameState = {
    time: 0,
    deltaTime: 0,
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
        lastSeedTime: 0
    },
    projectiles: []
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
    const seedGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const seedMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 }); // Dark brown
    const seed = new THREE.Mesh(seedGeometry, seedMaterial);
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

// Mouse click handler for seed shooting
function handleClick(event) {
    if (gameState.player.seeds > 0 && 
        currentTime - gameState.player.lastSeedTime > gameState.player.seedReloadTime * 1000) {
        
        const seed = createSeed();
        seed.position.copy(hamster.position);
        
        // Calculate shooting direction based on camera
        const shootDirection = new THREE.Vector3(0, 0, -1);
        shootDirection.applyQuaternion(camera.quaternion);
        
        seed.velocity = shootDirection.multiplyScalar(20); // Seed speed
        seed.velocity.y += 2; // Add upward arc
        
        gameState.projectiles.push(seed);
        scene.add(seed);
        
        gameState.player.seeds--;
        gameState.player.lastSeedTime = currentTime;
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

// Game loop with varied cloud movement and hamster physics
function gameLoop(currentTime) {
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
            projectile.velocity.y -= gameState.player.gravity * gameState.deltaTime;
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

    // Render scene
    renderer.render(scene, camera);

    // Continue game loop
    requestAnimationFrame(gameLoop);
}

// Start game loop
requestAnimationFrame(gameLoop);

// Log initialization success
console.log('Three.js scene initialized successfully with clouds'); 