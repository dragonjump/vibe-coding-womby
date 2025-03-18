// Import Three.js and SimplexNoise for terrain generation
import * as THREE from 'https://unpkg.com/three@0.157.0/build/three.module.js';
import { createNoise2D } from 'https://cdn.skypack.dev/simplex-noise';

// Constants for terrain generation
const CHUNK_SIZE = 32;
const RENDER_DISTANCE = 3;
const TREE_DENSITY = 0.02;
const GRASS_DENSITY = 2;

// Noise settings
const TERRAIN_SCALE = 100;
const TERRAIN_HEIGHT = 20;

class TerrainChunk {
    constructor(x, z, noise) {
        this.position = new THREE.Vector2(x, z);
        this.noise = noise;
        this.meshes = {
            terrain: null,
            trees: [],
            grass: [],
            rocks: []
        };
        this.objectPool = {
            trees: [],
            grass: [],
            rocks: []
        };
        this.generate();
    }

    generate() {
        // Generate terrain geometry
        const geometry = new THREE.PlaneGeometry(
            CHUNK_SIZE, 
            CHUNK_SIZE,
            CHUNK_SIZE / 2, 
            CHUNK_SIZE / 2
        );
        geometry.rotateX(-Math.PI / 2);

        // Apply height displacement using noise
        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const x = vertices[i] + this.position.x * CHUNK_SIZE;
            const z = vertices[i + 2] + this.position.y * CHUNK_SIZE;
            vertices[i + 1] = this.getHeight(x, z);
        }
        geometry.computeVertexNormals();

        // Create terrain material with grass texture
        const material = new THREE.MeshStandardMaterial({
            color: 0x3b7d4f,
            roughness: 0.8,
            metalness: 0.1,
            vertexColors: true
        });

        // Add vertex colors based on height and slope
        const colors = new Float32Array(vertices.length);
        for (let i = 0; i < vertices.length; i += 3) {
            const height = vertices[i + 1];
            const slope = this.calculateSlope(vertices, i);
            
            const color = new THREE.Color();
            if (height < 0.5) {
                color.setHex(0x3b7d4f); // Grass
            } else if (height < 5) {
                color.setHex(0x4f6d3b); // Dark grass
            } else {
                color.setHex(0x6d6d6d); // Rock
            }
            
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Create terrain mesh
        this.meshes.terrain = new THREE.Mesh(geometry, material);
        this.meshes.terrain.position.set(
            this.position.x * CHUNK_SIZE,
            0,
            this.position.y * CHUNK_SIZE
        );
        this.meshes.terrain.receiveShadow = true;
        this.meshes.terrain.castShadow = true;

        // Add vegetation
        this.addVegetation();
    }

    getHeight(x, z) {
        const scale = 0.01;
        return this.noise(x * scale, z * scale) * TERRAIN_HEIGHT;
    }

    calculateSlope(vertices, index) {
        if (index + 3 >= vertices.length) return 0;
        const height1 = vertices[index + 1];
        const height2 = vertices[index + 4];
        return Math.abs(height2 - height1);
    }

    addVegetation() {
        // Add trees
        for (let x = 0; x < CHUNK_SIZE; x += 5) {
            for (let z = 0; z < CHUNK_SIZE; z += 5) {
                if (Math.random() < TREE_DENSITY) {
                    const worldX = x + this.position.x * CHUNK_SIZE;
                    const worldZ = z + this.position.y * CHUNK_SIZE;
                    const height = this.getHeight(worldX, worldZ);
                    
                    if (height > 0 && height < 5) { // Only place trees on relatively flat ground
                        const tree = this.createTree(worldX, height, worldZ);
                        this.meshes.trees.push(tree);
                    }
                }
            }
        }

        // Add grass patches
        for (let i = 0; i < CHUNK_SIZE * GRASS_DENSITY; i++) {
            const x = Math.random() * CHUNK_SIZE + this.position.x * CHUNK_SIZE;
            const z = Math.random() * CHUNK_SIZE + this.position.y * CHUNK_SIZE;
            const height = this.getHeight(x, z);
            
            if (height > 0 && height < 5) {
                const grass = this.createGrass(x, height, z);
                this.meshes.grass.push(grass);
            }
        }
    }

    createTree(x, y, z) {
        // Check object pool first
        if (this.objectPool.trees.length > 0) {
            const tree = this.objectPool.trees.pop();
            tree.position.set(x, y, z);
            tree.visible = true;
            return tree;
        }

        const tree = new THREE.Group();
        
        // Create trunk
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 6);
        const trunkMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.8
        });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 1;
        trunk.castShadow = true;
        tree.add(trunk);
        
        // Create leaves
        const leavesGeometry = new THREE.ConeGeometry(1, 2, 6);
        const leavesMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22,
            roughness: 0.7
        });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.y = 2.5;
        leaves.castShadow = true;
        tree.add(leaves);
        
        tree.position.set(x, y, z);
        return tree;
    }

    createGrass(x, y, z) {
        // Check object pool first
        if (this.objectPool.grass.length > 0) {
            const grass = this.objectPool.grass.pop();
            grass.position.set(x, y, z);
            grass.visible = true;
            return grass;
        }

        const grassGeometry = new THREE.PlaneGeometry(0.5, 0.5);
        const grassMaterial = new THREE.MeshStandardMaterial({
            color: 0x3b7d4f,
            roughness: 0.8,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });

        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.position.set(x, y + 0.25, z);
        grass.rotation.y = Math.random() * Math.PI;
        return grass;
    }

    dispose() {
        // Store meshes in object pool
        this.meshes.trees.forEach(tree => {
            tree.visible = false;
            this.objectPool.trees.push(tree);
        });
        this.meshes.grass.forEach(grass => {
            grass.visible = false;
            this.objectPool.grass.push(grass);
        });

        // Clear current meshes
        this.meshes.terrain.geometry.dispose();
        this.meshes.terrain.material.dispose();
        this.meshes = {
            terrain: null,
            trees: [],
            grass: [],
            rocks: []
        };
    }
}

export class TerrainManager {
    constructor(scene) {
        this.scene = scene;
        this.noise = createNoise2D();
        this.chunks = new Map();
        this.chunkSize = 50;
        this.groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x44aa44,
            roughness: 0.8,
            metalness: 0.2
        });
        this.heightScale = 10;
        this.noiseScale = 0.02;
    }

    getChunkKey(x, z) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        return `${chunkX},${chunkZ}`;
    }

    generateChunk(x, z) {
        const chunkKey = this.getChunkKey(x, z);
        
        if (this.chunks.has(chunkKey)) {
            return;
        }

        const geometry = new THREE.PlaneGeometry(
            this.chunkSize,
            this.chunkSize,
            this.chunkSize / 2,
            this.chunkSize / 2
        );
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const vx = vertices[i] + x;
            const vz = vertices[i + 2] + z;
            vertices[i + 1] = this.getHeight(vx, vz);
        }

        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, this.groundMaterial);
        mesh.position.set(x, 0, z);
        this.scene.add(mesh);
        this.chunks.set(chunkKey, mesh);
    }

    getHeight(x, z) {
        const nx = x * this.noiseScale;
        const nz = z * this.noiseScale;
        
        // Multiple layers of noise for more interesting terrain
        const baseHeight = this.noise(nx, nz);
        const detailHeight = this.noise(nx * 2, nz * 2) * 0.5;
        const microDetail = this.noise(nx * 4, nz * 4) * 0.25;
        
        // Add mountain ranges
        const mountainNoise = this.noise(nx * 0.3, nz * 0.3);
        const mountainHeight = Math.max(0, mountainNoise * 2 - 0.5) * 30;
        
        // Combine all height components
        const finalHeight = (baseHeight + detailHeight + microDetail) * this.heightScale + mountainHeight;
        
        return finalHeight;
    }

    update(playerPosition) {
        const viewDistance = 150;
        const chunkSize = this.chunkSize;
        
        // Generate more chunks around player for smoother terrain transitions
        for (let x = -3; x <= 3; x++) {
            for (let z = -3; z <= 3; z++) {
                const chunkX = Math.floor(playerPosition.x / chunkSize) * chunkSize + x * chunkSize;
                const chunkZ = Math.floor(playerPosition.z / chunkSize) * chunkSize + z * chunkSize;
                this.generateChunk(chunkX, chunkZ);
            }
        }

        // Remove distant chunks
        for (const [key, chunk] of this.chunks) {
            const distance = new THREE.Vector2(
                chunk.position.x - playerPosition.x,
                chunk.position.z - playerPosition.z
            ).length();

            if (distance > viewDistance) {
                this.scene.remove(chunk);
                chunk.geometry.dispose();
                chunk.material.dispose();
                this.chunks.delete(key);
            }
        }
    }

    setGroundColor(color) {
        this.groundMaterial.color.copy(color);
    }

    reset() {
        // Remove all chunks
        for (const chunk of this.chunks.values()) {
            this.scene.remove(chunk);
            chunk.geometry.dispose();
            chunk.material.dispose();
        }
        this.chunks.clear();
    }

    cleanupChunks(maxZ) {
        for (const [key, chunk] of this.chunks) {
            if (chunk.position.z > maxZ) {
                this.scene.remove(chunk);
                chunk.geometry.dispose();
                chunk.material.dispose();
                this.chunks.delete(key);
            }
        }
    }
} 