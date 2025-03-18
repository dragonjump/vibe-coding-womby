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
        this.chunks = new Map();
        this.noise = createNoise2D();
        this.currentCenter = new THREE.Vector2();
        this.groundColor = new THREE.Color(0x3b7d4f);
    }

    update(playerPosition) {
        // Convert player position to chunk coordinates
        const chunkX = Math.floor(playerPosition.x / CHUNK_SIZE);
        const chunkZ = Math.floor(playerPosition.z / CHUNK_SIZE);
        
        if (this.currentCenter.x !== chunkX || this.currentCenter.y !== chunkZ) {
            this.currentCenter.set(chunkX, chunkZ);
            this.updateChunks();
        }
    }

    updateChunks() {
        // Keep track of chunks to keep
        const chunksToKeep = new Set();

        // Generate or update chunks in render distance
        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                const chunkX = this.currentCenter.x + x;
                const chunkZ = this.currentCenter.y + z;
                const key = `${chunkX},${chunkZ}`;
                chunksToKeep.add(key);

                if (!this.chunks.has(key)) {
                    const chunk = new TerrainChunk(chunkX, chunkZ, this.noise);
                    this.chunks.set(key, chunk);
                    
                    // Add chunk meshes to scene
                    this.scene.add(chunk.meshes.terrain);
                    chunk.meshes.trees.forEach(tree => this.scene.add(tree));
                    chunk.meshes.grass.forEach(grass => this.scene.add(grass));
                }
            }
        }

        // Remove chunks outside render distance
        for (const [key, chunk] of this.chunks) {
            if (!chunksToKeep.has(key)) {
                // Remove chunk meshes from scene
                this.scene.remove(chunk.meshes.terrain);
                chunk.meshes.trees.forEach(tree => this.scene.remove(tree));
                chunk.meshes.grass.forEach(grass => this.scene.remove(grass));
                
                // Dispose chunk
                chunk.dispose();
                this.chunks.delete(key);
            }
        }
    }

    getHeight(x, z) {
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        const key = `${chunkX},${chunkZ}`;
        const chunk = this.chunks.get(key);
        return chunk ? chunk.getHeight(x, z) : 0;
    }

    setGroundColor(color) {
        this.groundColor = new THREE.Color(color);
        // Update all existing chunks with new color
        for (const chunk of this.chunks.values()) {
            if (chunk.meshes.terrain) {
                const vertices = chunk.meshes.terrain.geometry.attributes.position.array;
                const colors = new Float32Array(vertices.length);
                
                for (let i = 0; i < vertices.length; i += 3) {
                    const height = vertices[i + 1];
                    const slope = chunk.calculateSlope(vertices, i);
                    
                    const color = new THREE.Color();
                    if (height < 0.5) {
                        color.copy(this.groundColor);
                    } else if (height < 5) {
                        color.copy(this.groundColor).multiplyScalar(0.8); // Darker variant
                    } else {
                        color.setHex(0x6d6d6d); // Rock color stays the same
                    }
                    
                    colors[i] = color.r;
                    colors[i + 1] = color.g;
                    colors[i + 2] = color.b;
                }
                
                chunk.meshes.terrain.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                chunk.meshes.terrain.geometry.attributes.color.needsUpdate = true;
            }
        }
    }

    reset() {
        // Remove and dispose all chunks
        for (const [key, chunk] of this.chunks) {
            // Remove chunk meshes from scene
            this.scene.remove(chunk.meshes.terrain);
            chunk.meshes.trees.forEach(tree => this.scene.remove(tree));
            chunk.meshes.grass.forEach(grass => this.scene.remove(grass));
            
            // Dispose chunk
            chunk.dispose();
        }
        
        // Clear chunks map
        this.chunks.clear();
        
        // Reset center position
        this.currentCenter.set(0, 0);
        
        // Generate initial chunks around origin
        this.updateChunks();
    }
} 