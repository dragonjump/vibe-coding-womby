import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

const CLOUD_LAYERS = [
    { height: 20, count: 8, size: 2.0, spread: 60, color: 0xffffff },   // High, extra large bright clouds
    { height: 15, count: 10, size: 1.5, spread: 50, color: 0xe8e8e8 },  // High, large clouds
    { height: 10, count: 12, size: 1.2, spread: 40, color: 0xd8d8d8 },  // Medium height, medium clouds
    { height: 6, count: 8, size: 0.9, spread: 30, color: 0xc8c8c8 },    // Low, darker clouds
    { height: 4, count: 6, size: 0.7, spread: 25, color: 0xb8b8b8 },    // Very low, darkest clouds
];

const CLOUD_SPAWN_DISTANCE = 120;
const CLOUD_DESPAWN_DISTANCE = 180;

export class CloudManager {
    constructor(scene) {
        this.scene = scene;
        this.clouds = [];
        this.cloudPool = [];
        this.currentLevel = null;
    }

    setLevel(levelId) {
        this.currentLevel = levelId;
    }

    createCloud(x, y, z, size = 1, cloudColor = 0xffffff) {
        // Check cloud pool first
        if (this.cloudPool.length > 0) {
            const cloud = this.cloudPool.pop();
            cloud.position.set(x, y, z);
            cloud.visible = true;
            return cloud;
        }

        const cloudGroup = new THREE.Group();
        
        // Create multiple spheres for each cloud with more variation
        const numPuffs = 8 + Math.floor(Math.random() * 6); // 8-13 puffs per cloud
        
        // Create main cloud body
        for (let i = 0; i < numPuffs; i++) {
            const puffSize = (1.2 + Math.random() * 0.8) * size;
            const puffGeometry = new THREE.SphereGeometry(puffSize, 16, 16);
            const puffMaterial = new THREE.MeshStandardMaterial({
                color: cloudColor,
                transparent: true,
                opacity: 0.7 + Math.random() * 0.3, // More opacity variation
                metalness: 0.1,
                roughness: 0.8,
            });
            const puff = new THREE.Mesh(puffGeometry, puffMaterial);
            
            // More varied positioning within cloud group
            puff.position.x = (i - numPuffs/2) * (1.0 * size) + (Math.random() - 0.5) * size;
            puff.position.y = (Math.random() - 0.5) * (1.8 * size);
            puff.position.z = (Math.random() - 0.5) * (1.8 * size);
            
            // Random scale for more natural look
            const puffScale = (0.7 + Math.random() * 0.6) * size;
            puff.scale.set(puffScale, puffScale * 0.7, puffScale);
            
            cloudGroup.add(puff);
        }

        // Add glowing core for bright clouds (only in Cloud City)
        if (this.currentLevel === 2 && Math.random() < 0.3) {
            const glowGeometry = new THREE.SphereGeometry(size * 1.2, 16, 16);
            const glowMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.2,
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            cloudGroup.add(glow);

            // Add point light for some clouds
            const light = new THREE.PointLight(0xffffff, 0.4, size * 5);
            light.position.set(0, 0, 0);
            cloudGroup.add(light);
        }
        
        // Position the entire cloud
        cloudGroup.position.set(x, y, z);
        // Random rotation for variety
        cloudGroup.rotation.y = Math.random() * Math.PI;
        cloudGroup.rotation.z = (Math.random() - 0.5) * 0.3;

        // Add movement properties
        cloudGroup.userData = {
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            floatSpeed: 0.2 + Math.random() * 0.3,
            floatOffset: Math.random() * Math.PI * 2,
            originalY: y
        };

        return cloudGroup;
    }

    update(playerPosition, deltaTime) {
        // Update existing clouds
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const cloud = this.clouds[i];
            
            // Enhanced cloud movement
            const speed = 0.3 + (i % 4) * 0.1;
            const amplitude = 0.8 + (i % 3) * 0.4;
            
            // More complex movement pattern
            cloud.position.x += Math.sin(Date.now() * 0.001 * speed) * 0.02;
            cloud.position.y = cloud.userData.originalY + Math.sin(Date.now() * 0.0005 + cloud.userData.floatOffset) * amplitude;
            cloud.rotation.y += cloud.userData.rotationSpeed * 0.01;

            // Subtle scale pulsing for Cloud City
            if (this.currentLevel === 2) {
                const pulseScale = 1 + Math.sin(Date.now() * 0.001 + cloud.userData.floatOffset) * 0.05;
                cloud.scale.set(pulseScale, pulseScale, pulseScale);
            }

            // Check if cloud is too far from player
            if (cloud.position.distanceTo(playerPosition) > CLOUD_DESPAWN_DISTANCE) {
                this.scene.remove(cloud);
                this.cloudPool.push(cloud);
                this.clouds.splice(i, 1);
            }
        }

        // Spawn new clouds if needed
        CLOUD_LAYERS.forEach(layer => {
            const spawnChance = this.currentLevel === 2 ? 0.04 : 0.02; // Double spawn rate for Cloud City
            if (Math.random() < spawnChance) {
                const angle = Math.random() * Math.PI * 2;
                const distance = CLOUD_SPAWN_DISTANCE;
                
                const x = playerPosition.x + Math.cos(angle) * distance;
                const y = layer.height + (Math.random() - 0.5) * 4; // More height variation
                const z = playerPosition.z + Math.sin(angle) * distance;
                
                const cloud = this.createCloud(x, y, z, layer.size, layer.color);
                this.clouds.push(cloud);
                this.scene.add(cloud);
            }
        });
    }

    dispose() {
        // Remove all clouds and clear arrays
        this.clouds.forEach(cloud => {
            this.scene.remove(cloud);
            cloud.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        });
        this.clouds = [];
        this.cloudPool = [];
    }
} 