// Level configurations
const LEVELS = [
    {
        id: 1,
        name: "Training Grounds",
        description: "Learn the basics of rocket jumping and seed shooting",
        targetScore: 500,
        collectibles: {
            count: 10,
            pattern: "circle",
            radius: 8,
            height: 3
        },
        obstacles: [
            { x: 5, y: 0, z: 5, w: 1, h: 3, d: 1 },
            { x: -5, y: 0, z: -5, w: 1, h: 2, d: 1 },
            { x: 5, y: 0, z: -5, w: 1, h: 4, d: 1 },
            { x: -5, y: 0, z: 5, w: 1, h: 2.5, d: 1 }
        ],
        environment: {
            groundColor: 0x90EE90,
            skyColor: 0x87CEEB,
            fogDensity: 0
        }
    },
    {
        id: 2,
        name: "Cloud City",
        description: "Navigate through floating platforms in the sky",
        targetScore: 1000,
        collectibles: {
            count: 15,
            pattern: "spiral",
            radius: 10,
            height: 5
        },
        obstacles: [
            // Floating platforms
            { x: 0, y: 4, z: 0, w: 3, h: 0.5, d: 3 },
            { x: 5, y: 6, z: 5, w: 2, h: 0.5, d: 2 },
            { x: -5, y: 3, z: -5, w: 2, h: 0.5, d: 2 },
            { x: 5, y: 5, z: -5, w: 2, h: 0.5, d: 2 },
            { x: -5, y: 7, z: 5, w: 2, h: 0.5, d: 2 }
        ],
        environment: {
            groundColor: 0xADD8E6,
            skyColor: 0x6CA0DC,
            fogDensity: 0.01
        }
    },
    {
        id: 3,
        name: "Sunset Challenge",
        description: "Master your skills in the challenging sunset arena",
        targetScore: 1500,
        collectibles: {
            count: 20,
            pattern: "wave",
            radius: 12,
            height: 6
        },
        obstacles: [
            // Moving platforms and more complex obstacles
            { x: 0, y: 3, z: 0, w: 4, h: 0.5, d: 4, moving: true, speed: 2 },
            { x: 6, y: 5, z: 6, w: 2, h: 0.5, d: 2, moving: true, speed: 3 },
            { x: -6, y: 4, z: -6, w: 2, h: 0.5, d: 2, moving: true, speed: 2.5 },
            { x: 6, y: 6, z: -6, w: 2, h: 0.5, d: 2, moving: true, speed: 3.5 },
            { x: -6, y: 7, z: 6, w: 2, h: 0.5, d: 2, moving: true, speed: 3 }
        ],
        environment: {
            groundColor: 0xDEB887,
            skyColor: 0xFF7F50,
            fogDensity: 0.02
        }
    }
];

// Pattern generators for collectibles
const collectiblePatterns = {
    circle: (count, radius, height) => {
        const positions = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            positions.push({
                x: Math.cos(angle) * radius,
                y: height,
                z: Math.sin(angle) * radius
            });
        }
        return positions;
    },

    spiral: (count, radius, height) => {
        const positions = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 4;
            const r = (i / count) * radius;
            positions.push({
                x: Math.cos(angle) * r,
                y: height + (i / count) * height,
                z: Math.sin(angle) * r
            });
        }
        return positions;
    },

    wave: (count, radius, height) => {
        const positions = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const waveHeight = Math.sin(angle * 3) * 2;
            positions.push({
                x: Math.cos(angle) * radius,
                y: height + waveHeight,
                z: Math.sin(angle) * radius
            });
        }
        return positions;
    }
};

// Level management functions
class LevelManager {
    constructor() {
        this.currentLevel = 1;
        this.highScores = new Map();
        this.loadHighScores();
    }

    getCurrentLevel() {
        return LEVELS.find(level => level.id === this.currentLevel);
    }

    getCollectiblePositions() {
        const level = this.getCurrentLevel();
        const pattern = collectiblePatterns[level.collectibles.pattern];
        return pattern(
            level.collectibles.count,
            level.collectibles.radius,
            level.collectibles.height
        );
    }

    loadHighScores() {
        const saved = localStorage.getItem('rocketHamsterHighScores');
        if (saved) {
            this.highScores = new Map(JSON.parse(saved));
        }
    }

    saveHighScore(levelId, score) {
        const currentHigh = this.highScores.get(levelId) || 0;
        if (score > currentHigh) {
            this.highScores.set(levelId, score);
            localStorage.setItem('rocketHamsterHighScores', 
                JSON.stringify([...this.highScores]));
            return true;
        }
        return false;
    }

    isLevelComplete(score) {
        const level = this.getCurrentLevel();
        return score >= level.targetScore;
    }

    nextLevel() {
        if (this.currentLevel < LEVELS.length) {
            this.currentLevel++;
            return true;
        }
        return false;
    }

    resetProgress() {
        this.currentLevel = 1;
    }
}

export { LevelManager, LEVELS }; 