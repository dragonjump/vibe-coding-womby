// Achievement definitions
const ACHIEVEMENTS = [
    {
        id: 'SEED_COLLECTOR',
        name: 'Seed Collector',
        description: 'Collect 50 seeds in total',
        icon: '🌱',
        requirement: 50,
        type: 'CUMULATIVE'
    },
    {
        id: 'POWER_PLAYER',
        name: 'Power Player',
        description: 'Collect 20 power-ups',
        icon: '⚡',
        requirement: 20,
        type: 'CUMULATIVE'
    },
    {
        id: 'HIGH_FLYER',
        name: 'High Flyer',
        description: 'Stay airborne for 30 seconds',
        icon: '🦅',
        requirement: 30,
        type: 'CONTINUOUS'
    },
    {
        id: 'PERFECT_RUN',
        name: 'Perfect Run',
        description: 'Complete a level without hitting any obstacles',
        icon: '🎯',
        requirement: 1,
        type: 'SINGLE'
    },
    {
        id: 'SPEED_DEMON',
        name: 'Speed Demon',
        description: 'Complete level 1 in under 60 seconds',
        icon: '⚡',
        requirement: 60,
        type: 'SINGLE'
    },
    {
        id: 'HIGH_SCORER',
        name: 'High Scorer',
        description: 'Score over 1000 points in a single level',
        icon: '🏆',
        requirement: 1000,
        type: 'SINGLE'
    },
    {
        id: 'MASTER_PILOT',
        name: 'Master Pilot',
        description: 'Complete all levels',
        icon: '👑',
        requirement: 3,
        type: 'CUMULATIVE'
    }
];

export class AchievementManager {
    constructor() {
        this.achievements = new Map();
        this.initializeAchievements();
        
        // Level tracking
        this.levelStartTime = 0;
        this.obstacleHits = 0;
        this.continuousFlightTime = 0;
        this.maxFlightTime = 0;
    }

    initializeAchievements() {
        // Load saved achievements from localStorage
        const savedAchievements = localStorage.getItem('achievements');
        const savedData = savedAchievements ? JSON.parse(savedAchievements) : {};

        ACHIEVEMENTS.forEach(achievement => {
            this.achievements.set(achievement.id, {
                ...achievement,
                unlocked: savedData[achievement.id]?.unlocked || false,
                progress: savedData[achievement.id]?.progress || 0
            });
        });
    }

    saveAchievements() {
        const saveData = {};
        this.achievements.forEach((achievement, id) => {
            saveData[id] = {
                unlocked: achievement.unlocked,
                progress: achievement.progress
            };
        });
        localStorage.setItem('achievements', JSON.stringify(saveData));
    }

    updateAchievement(id, progress) {
        const achievement = this.achievements.get(id);
        if (!achievement || achievement.unlocked) return;

        achievement.progress = progress;
        
        if (achievement.progress >= achievement.requirement) {
            achievement.unlocked = true;
            this.triggerAchievementUnlock(achievement);
        }
        
        this.saveAchievements();
    }

    triggerAchievementUnlock(achievement) {
        // Create achievement notification
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.padding = '15px 20px';
        notification.style.borderRadius = '10px';
        notification.style.display = 'flex';
        notification.style.alignItems = 'center';
        notification.style.gap = '10px';
        notification.style.zIndex = '1000';
        notification.style.animation = 'achievementSlide 0.5s ease-out';

        notification.innerHTML = `
            <div style="font-size: 24px;">${achievement.icon}</div>
            <div>
                <div style="font-weight: bold;">Achievement Unlocked!</div>
                <div>${achievement.name}</div>
            </div>
        `;

        document.body.appendChild(notification);

        // Play achievement sound
        const audioContext = window.audioContext;
        if (audioContext && window.soundBuffers?.achievement) {
            const source = audioContext.createBufferSource();
            source.buffer = window.soundBuffers.achievement;
            source.connect(audioContext.destination);
            source.start();
        }

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'achievementFade 0.5s ease-out';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // Achievement tracking methods
    collectSeed() {
        const achievement = this.achievements.get('SEED_COLLECTOR');
        if (achievement && !achievement.unlocked) {
            this.updateAchievement('SEED_COLLECTOR', achievement.progress + 1);
        }
    }

    collectPowerUp() {
        const achievement = this.achievements.get('POWER_PLAYER');
        if (achievement && !achievement.unlocked) {
            this.updateAchievement('POWER_PLAYER', achievement.progress + 1);
        }
    }

    updateFlightTime(isAirborne, deltaTime) {
        if (isAirborne) {
            this.continuousFlightTime += deltaTime;
            this.maxFlightTime = Math.max(this.maxFlightTime, this.continuousFlightTime);
            
            const achievement = this.achievements.get('HIGH_FLYER');
            if (achievement && !achievement.unlocked) {
                this.updateAchievement('HIGH_FLYER', this.maxFlightTime);
            }
        } else {
            this.continuousFlightTime = 0;
        }
    }

    hitObstacleEvent() {
        this.obstacleHits++;
    }

    startLevel() {
        this.levelStartTime = Date.now();
        this.obstacleHits = 0;
    }

    checkLevelComplete(levelId, score, highScore) {
        // Perfect Run achievement
        if (this.obstacleHits === 0) {
            this.updateAchievement('PERFECT_RUN', 1);
        }

        // Speed Demon achievement (Level 1 only)
        if (levelId === 1) {
            const levelTime = (Date.now() - this.levelStartTime) / 1000;
            if (levelTime <= 60) {
                this.updateAchievement('SPEED_DEMON', 1);
            }
        }

        // High Scorer achievement
        if (score >= 1000) {
            this.updateAchievement('HIGH_SCORER', 1);
        }

        // Master Pilot achievement
        if (levelId === 3 && score >= LEVELS[2].targetScore) {
            const achievement = this.achievements.get('MASTER_PILOT');
            if (achievement && !achievement.unlocked) {
                this.updateAchievement('MASTER_PILOT', achievement.progress + 1);
            }
        }
    }

    getProgress() {
        return Array.from(this.achievements.values());
    }
}

// Add achievement animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes achievementSlide {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }

    @keyframes achievementFade {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style); 