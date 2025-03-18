import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';

const CLOUD_LAYERS = [
    { height: 15, count: 5, size: 1.5, spread: 50 },   // High, large clouds
    { height: 10, count: 8, size: 1.0, spread: 40 },   // Medium height, medium clouds
    { height: 6, count: 4, size: 0.7, spread: 30 },    // Low, small clouds
];

const CLOUD_SPAWN_DISTANCE = 100;
const CLOUD_DESPAWN_DISTANCE = 150;

export class CloudManager {
    constructor(scene) {
        this.scene = scene;
        this.clouds = [];
        this.cloudPool = [];
    }

    createCloud(x, y, z, size = 1) {
        // Check cloud pool first
        if (this.cloudPool.length > 0) {
            const cloud = this.cloudPool.pop();
            cloud.position.set(x, y, z);
            cloud.visible = true;
            return cloud;
        }

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

    update(playerPosition, deltaTime) {
        // Update existing clouds
        for (let i = this.clouds.length - 1; i >= 0; i--) {
            const cloud = this.clouds[i];
            
            // Move clouds
            const speed = 0.2 + (i % 3) * 0.1;
            const amplitude = 0.5 + (i % 2) * 0.5;
            
            cloud.position.x += Math.sin(Date.now() * 0.001 * speed) * 0.01;
            cloud.position.y += Math.cos(Date.now() * 0.001 * speed) * 0.005;
            cloud.rotation.y += 0.001 * speed;

            // Check if cloud is too far from player
            if (cloud.position.distanceTo(playerPosition) > CLOUD_DESPAWN_DISTANCE) {
                this.scene.remove(cloud);
                this.cloudPool.push(cloud);
                this.clouds.splice(i, 1);
            }
        }

        // Spawn new clouds if needed
        CLOUD_LAYERS.forEach(layer => {
            if (Math.random() < 0.02) { // 2% chance per frame per layer
                const angle = Math.random() * Math.PI * 2;
                const distance = CLOUD_SPAWN_DISTANCE;
                
                const x = playerPosition.x + Math.cos(angle) * distance;
                const y = layer.height + (Math.random() - 0.5) * 2;
                const z = playerPosition.z + Math.sin(angle) * distance;
                
                const cloud = this.createCloud(x, y, z, layer.size);
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