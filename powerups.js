// Power-up configurations
export const POWERUP_TYPES = {
    SPEED_BOOST: {
        id: 'speed',
        name: 'Speed Boost',
        color: 0x00FF00,
        duration: 5,
        effect: (player) => {
            player.speed *= 1.5;
            player.boostForce *= 1.3;
        },
        revert: (player) => {
            player.speed /= 1.5;
            player.boostForce /= 1.3;
        }
    },
    SHIELD: {
        id: 'shield',
        name: 'Shield',
        color: 0x0088FF,
        duration: 8,
        effect: (player) => {
            player.isInvulnerable = true;
        },
        revert: (player) => {
            player.isInvulnerable = false;
        }
    },
    RAPID_FIRE: {
        id: 'rapid',
        name: 'Rapid Fire',
        color: 0xFF0000,
        duration: 6,
        effect: (player) => {
            player.seedReloadTime *= 0.3;
            player.maxSeeds += 5;
        },
        revert: (player) => {
            player.seedReloadTime /= 0.3;
            player.maxSeeds -= 5;
        }
    },
    FUEL_REFILL: {
        id: 'fuel',
        name: 'Fuel Refill',
        color: 0xFFAA00,
        duration: 0, // Instant effect
        effect: (player) => {
            player.fuel = player.maxFuel;
            player.fuelRegenRate *= 2;
        },
        revert: (player) => {
            player.fuelRegenRate /= 2;
        }
    }
};

export class PowerUpManager {
    constructor() {
        this.activePowerUps = new Map();
        this.powerUpPool = [];
    }

    createPowerUp(type, position) {
        const powerUp = {
            type: POWERUP_TYPES[type],
            position: position.clone(),
            rotation: 0,
            collected: false,
            baseY: position.y,
            mesh: null
        };
        this.powerUpPool.push(powerUp);
        return powerUp;
    }

    updatePowerUps(deltaTime, currentTime) {
        // Update active power-ups
        for (const [id, powerUp] of this.activePowerUps.entries()) {
            powerUp.timeRemaining -= deltaTime;
            if (powerUp.timeRemaining <= 0) {
                this.deactivatePowerUp(id);
            }
        }

        // Animate power-up meshes
        this.powerUpPool.forEach(powerUp => {
            if (powerUp.mesh && !powerUp.collected) {
                powerUp.rotation += deltaTime * 2;
                powerUp.mesh.rotation.y = powerUp.rotation;
                powerUp.mesh.position.y = powerUp.baseY + Math.sin(currentTime * 0.002) * 0.3;
            }
        });
    }

    activatePowerUp(powerUp, player) {
        if (powerUp.type.duration > 0) {
            const id = Date.now().toString();
            this.activePowerUps.set(id, {
                type: powerUp.type,
                timeRemaining: powerUp.type.duration,
                player: player
            });
            powerUp.type.effect(player);
        } else {
            // Instant effect
            powerUp.type.effect(player);
            powerUp.type.revert(player);
        }
    }

    deactivatePowerUp(id) {
        const powerUp = this.activePowerUps.get(id);
        if (powerUp) {
            powerUp.type.revert(powerUp.player);
            this.activePowerUps.delete(id);
        }
    }

    getActivePowerUps() {
        return Array.from(this.activePowerUps.entries()).map(([id, powerUp]) => ({
            name: powerUp.type.name,
            timeRemaining: Math.ceil(powerUp.timeRemaining)
        }));
    }

    clearPowerUps() {
        // Deactivate all active power-ups
        for (const [id, powerUp] of this.activePowerUps.entries()) {
            powerUp.type.revert(powerUp.player);
        }
        this.activePowerUps.clear();
        this.powerUpPool = [];
    }
} 