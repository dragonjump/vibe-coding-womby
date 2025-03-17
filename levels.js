// Level configurations
export const LEVELS = [
    {
        id: 1,
        urlName: "training",
        name: "Training Grounds",
        description: "Learn the basics of rocket jumping and seed shooting",
        targetScore: 500,
        collectibles: {
            count: 10,
            pattern: "circle",
            radius: 8,
            height: 3
        },
        powerUps: [
            { type: 'SPEED_BOOST', x: 0, y: 3, z: -5 },
            { type: 'FUEL_REFILL', x: 0, y: 3, z: 5 }
        ],
        obstacles: [
            { x: -5, y: 0, z: -5, w: 2, h: 3, d: 2 },
            { x: 5, y: 0, z: -5, w: 2, h: 3, d: 2 },
            { x: -5, y: 0, z: 5, w: 2, h: 3, d: 2 },
            { x: 5, y: 0, z: 5, w: 2, h: 3, d: 2 }
        ],
        environment: {
            groundColor: 0x90EE90, // Light green
            skyColor: 0x87CEEB,    // Light blue
            fogDensity: 0
        }
    },
    {
        id: 2,
        urlName: "cloud",
        name: "Cloud City",
        description: "Navigate through floating platforms in the sky",
        targetScore: 1000,
        collectibles: {
            count: 15,
            pattern: "spiral",
            radius: 10,
            height: 5
        },
        powerUps: [
            { type: 'SHIELD', x: -6, y: 5, z: 0 },
            { type: 'RAPID_FIRE', x: 6, y: 5, z: 0 },
            { type: 'FUEL_REFILL', x: 0, y: 7, z: 8 }
        ],
        obstacles: [
            { x: 0, y: 2, z: -8, w: 4, h: 1, d: 4, moving: true, speed: 0.5 },
            { x: -6, y: 4, z: 0, w: 4, h: 1, d: 4 },
            { x: 6, y: 4, z: 0, w: 4, h: 1, d: 4 },
            { x: 0, y: 6, z: 8, w: 4, h: 1, d: 4 },
            { x: 0, y: 8, z: 0, w: 4, h: 1, d: 4 }
        ],
        environment: {
            groundColor: 0xADD8E6, // Light blue
            skyColor: 0x4682B4,    // Darker blue
            fogDensity: 0.01
        }
    },
    {
        id: 3,
        urlName: "sunset",
        name: "Sunset Challenge",
        description: "Master your skills in a challenging arena",
        targetScore: 1500,
        collectibles: {
            count: 20,
            pattern: "wave",
            radius: 12,
            height: 8
        },
        powerUps: [
            { type: 'SPEED_BOOST', x: -8, y: 4, z: 0 },
            { type: 'SHIELD', x: 8, y: 4, z: 0 },
            { type: 'RAPID_FIRE', x: 0, y: 6, z: -8 },
            { type: 'FUEL_REFILL', x: 0, y: 6, z: 8 },
            { type: 'SPEED_BOOST', x: 0, y: 8, z: 0 }
        ],
        obstacles: [
            { x: -8, y: 3, z: 0, w: 3, h: 1, d: 3, moving: true, speed: 0.8 },
            { x: 8, y: 3, z: 0, w: 3, h: 1, d: 3, moving: true, speed: 0.8 },
            { x: 0, y: 5, z: -8, w: 3, h: 1, d: 3, moving: true, speed: 0.8 },
            { x: 0, y: 5, z: 8, w: 3, h: 1, d: 3, moving: true, speed: 0.8 },
            { x: 0, y: 7, z: 0, w: 3, h: 1, d: 3, moving: true, speed: 1.0 }
        ],
        environment: {
            groundColor: 0x8B4513, // Brown
            skyColor: 0xFF7F50,    // Coral
            fogDensity: 0.02
        }
    }
];

// Level management class
export class LevelManager {
    constructor() {
        this.currentLevel = this.getLevelFromURL() || 1;
        this.highScores = new Map();
        
        // Load high scores from localStorage
        this.loadHighScores();
    }

    getLevelFromURL() {
        const params = new URLSearchParams(window.location.search);
        const levelParam = params.get('level');
        
        if (!levelParam) return null;

        // Try to match by ID
        if (!isNaN(levelParam)) {
            const levelId = parseInt(levelParam);
            if (LEVELS.some(l => l.id === levelId)) {
                return levelId;
            }
        }

        // Try to match by name
        const levelByName = LEVELS.find(l => 
            l.urlName.toLowerCase() === levelParam.toLowerCase() ||
            l.name.toLowerCase().replace(/\s+/g, '') === levelParam.toLowerCase()
        );
        
        return levelByName ? levelByName.id : null;
    }

    setLevel(levelIdentifier) {
        let newLevel = null;

        // Try to match by ID
        if (typeof levelIdentifier === 'number') {
            if (LEVELS.some(l => l.id === levelIdentifier)) {
                newLevel = levelIdentifier;
            }
        } else if (typeof levelIdentifier === 'string') {
            // Try to match by name
            const level = LEVELS.find(l => 
                l.urlName.toLowerCase() === levelIdentifier.toLowerCase() ||
                l.name.toLowerCase().replace(/\s+/g, '') === levelIdentifier.toLowerCase()
            );
            if (level) {
                newLevel = level.id;
            }
        }

        if (newLevel) {
            this.currentLevel = newLevel;
            // Update URL without refreshing the page
            const url = new URL(window.location);
            url.searchParams.set('level', LEVELS.find(l => l.id === newLevel).urlName);
            window.history.pushState({}, '', url);
            return true;
        }
        return false;
    }

    getCurrentLevel() {
        return LEVELS.find(level => level.id === this.currentLevel);
    }

    loadHighScores() {
        const savedScores = localStorage.getItem('rocketHamsterHighScores');
        if (savedScores) {
            const scores = JSON.parse(savedScores);
            Object.entries(scores).forEach(([level, score]) => {
                this.highScores.set(parseInt(level), score);
            });
        }
    }

    saveHighScores() {
        const scores = {};
        this.highScores.forEach((score, level) => {
            scores[level] = score;
        });
        localStorage.setItem('rocketHamsterHighScores', JSON.stringify(scores));
    }

    saveHighScore(level, score) {
        const currentHighScore = this.highScores.get(level) || 0;
        if (score > currentHighScore) {
            this.highScores.set(level, score);
            this.saveHighScores();
            return true;
        }
        return false;
    }

    isLevelComplete(score) {
        const currentLevel = this.getCurrentLevel();
        return score >= currentLevel.targetScore;
    }

    nextLevel() {
        if (this.currentLevel < LEVELS.length) {
            this.currentLevel++;
            return true;
        }
        return false;
    }

    getCollectiblePositions() {
        const level = this.getCurrentLevel();
        const { pattern, count, radius, height } = level.collectibles;
        
        switch (pattern) {
            case "circle":
                return this.generateCirclePattern(count, radius, height);
            case "spiral":
                return this.generateSpiralPattern(count, radius, height);
            case "wave":
                return this.generateWavePattern(count, radius, height);
            default:
                return this.generateCirclePattern(count, radius, height);
        }
    }

    generateCirclePattern(count, radius, baseHeight) {
        const positions = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            positions.push({
                x: Math.cos(angle) * radius,
                y: baseHeight + Math.sin(i * 0.5) * 2,
                z: Math.sin(angle) * radius
            });
        }
        return positions;
    }

    generateSpiralPattern(count, maxRadius, maxHeight) {
        const positions = [];
        for (let i = 0; i < count; i++) {
            const progress = i / count;
            const angle = progress * Math.PI * 4;
            const radius = progress * maxRadius;
            positions.push({
                x: Math.cos(angle) * radius,
                y: maxHeight + progress * maxHeight,
                z: Math.sin(angle) * radius
            });
        }
        return positions;
    }

    generateWavePattern(count, maxRadius, baseHeight) {
        const positions = [];
        for (let i = 0; i < count; i++) {
            const progress = i / count;
            const angle = progress * Math.PI * 2;
            positions.push({
                x: Math.cos(angle) * maxRadius,
                y: baseHeight + Math.sin(progress * Math.PI * 4) * 3,
                z: Math.sin(angle) * maxRadius
            });
        }
        return positions;
    }
} 