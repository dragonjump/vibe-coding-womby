// Power-up types definition
export const POWERUP_TYPES = {
    BOMB: {
        name: 'Bomb',
        color: 0xff0000,
        duration: 1,
        effect: (player, gameState) => {
            // Destroy all foxes with explosion effects
            gameState.enemies.forEach(fox => {
                // Commented out explosion effect
                // createExplosion(fox.position, 0xff3300);
                gameState.scene.remove(fox);
                
                const score = 200;
                gameState.score += score;
                showScorePopup(score, fox.position);
            });
            gameState.enemies.length = 0;
            playSound('hit');
            gameState.effects.screenShake = 0.5;
        }
    },
    STAR: {
        name: 'Star',
        color: 0xffff00,
        duration: 10,
        effect: (player, gameState) => {
            player.starPowerActive = true;
            player.originalShoot = player.shoot;
            
            // Override shooting behavior
            player.shoot = () => {
                if (player.seeds > 0 && 
                    gameState.time - player.lastSeedTime > player.seedReloadTime * 1000) {
                    
                    const numDirections = 8;
                    for (let i = 0; i < numDirections; i++) {
                        const angle = (i / numDirections) * Math.PI * 2;
                        const direction = new THREE.Vector3(
                            Math.cos(angle),
                            0.5,
                            Math.sin(angle)
                        ).normalize();
                        
                        const seed = createSeed();
                        seed.position.copy(player.position);
                        seed.position.y += 0.5;
                        seed.velocity = direction.multiplyScalar(40);
                        
                        gameState.projectiles.push(seed);
                        gameState.scene.add(seed);
                    }
                    
                    playSound('shoot');
                    player.seeds--;
                    player.lastSeedTime = gameState.time;
                    player.seedReloadTime = 0.2;
                }
            };
            
            // Restore original shooting after duration
            setTimeout(() => {
                player.shoot = player.originalShoot;
                player.starPowerActive = false;
            }, 10000);
        }
    },
    CARROT: {
        name: 'Carrot',
        color: 0xff6600,
        duration: 1,
        effect: (player, gameState) => {
            const healAmount = player.maxHealth * 0.2;
            player.health = Math.min(player.maxHealth, player.health + healAmount);
            
            createHealEffect(player.position);
            playSound('collect');
            showScorePopup(`+${Math.round(healAmount)} HP`, player.position);
        }
    }
};

// Power-up manager class
export class PowerUpManager {
    constructor() {
        this.powerUpPool = [];
        this.activePowerUps = [];
    }
    
    updatePowerUps(deltaTime, currentTime) {
        // Update active power-ups
        this.activePowerUps = this.activePowerUps.filter(powerUp => {
            powerUp.timeRemaining -= deltaTime;
            return powerUp.timeRemaining > 0;
        });
    }
    
    activatePowerUp(powerUp, player) {
        if (powerUp.type.duration > 0) {
            this.activePowerUps.push({
                name: powerUp.type.name,
                timeRemaining: powerUp.type.duration
            });
        }
        powerUp.type.effect(player);
    }
    
    getActivePowerUps() {
        return this.activePowerUps;
    }
}

// Helper function to create heal effect
function createHealEffect(position) {
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 4, 4),
            new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                transparent: true,
                opacity: 1
            })
        );
        
        particle.position.copy(position);
        particle.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            Math.random() * 5,
            (Math.random() - 0.5) * 5
        );
        particle.lifetime = 1 + Math.random();
        
        particles.push(particle);
    }
    
    return particles;
} 