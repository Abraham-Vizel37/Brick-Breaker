import { settings } from './constants.js';
import { paddle } from './paddle.js';

// Represents a single laser beam
// Lasers are stored in gameState.lasers array

export function createLaserBeam(isLeft) {
    const laserWidth = 4;
    const laserHeight = settings.laserHeight;
    const xOffset = paddle.width * settings.laserXOffset;
    
    return {
        x: isLeft ? (paddle.x + xOffset) : (paddle.x + paddle.width - xOffset),
        y: paddle.y, // Start at the top of the paddle
        width: laserWidth,
        height: laserHeight,
        speed: 8, // Vertical speed of the laser
        active: true
    };
}

export function drawLasers(ctx, lasers) { // Expects gameState.lasers array
    if (!ctx) return;

    lasers.forEach(laser => {
        if (laser.active) {
            ctx.beginPath();
            ctx.rect(laser.x - laser.width / 2, laser.y, laser.width, laser.height);
            ctx.fillStyle = '#FF0000'; // Red laser color
            ctx.fill();
            ctx.closePath();
        }
    });
}

export function moveLaser(laser) {
    if (laser.active) {
        laser.y -= laser.speed;
        if (laser.y + laser.height < 0) { // Off screen
            laser.active = false;
        }
    }
} 