import { settings } from './constants.js';
import { paddle } from './paddle.js';
import { handlePowerupDrop } from './powerup.js';
// gameState and its properties (balls, bricks, lasers, powerups, score, lives, level, etc.) 
// will be passed as parameters to these collision functions.
// uiUpdateCallback will be a function to call updateHUD, updateFinalScore etc.

export function checkBrickCollision(ball, bricks, currentGameState, uiUpdateCallback, checkLevelCompletionCallback) {
    let anyBrickHit = false;
    const activeBricks = bricks.filter(brick => brick.status === 1);

    // Level completion is checked in game.js before calling this or after a brick is hit.
    // For now, we'll assume checkLevelCompletionCallback is called from game.js after a hit.

    for (let i = activeBricks.length - 1; i >= 0; i--) {
        const brick = activeBricks[i];
        if (ball.x + ball.radius > brick.x &&
            ball.x - ball.radius < brick.x + brick.width &&
            ball.y + ball.radius > brick.y &&
            ball.y - ball.radius < brick.y + brick.height) {
            
            anyBrickHit = true;

            // --- Animation Trigger ---
            // Trigger hit animation for Gold (unbreakable) or Silver bricks
            // Silver bricks are identified by originalColor and having maxHp > 1
            if (brick.isUnbreakable || (brick.originalColor === '#BCBCBC' && brick.maxHp > 1)) {
                brick.isHitAnimating = true;
                brick.hitAnimationStartTime = performance.now();
            }
            // --- End Animation Trigger ---

            if (brick.isUnbreakable) {
                if (ball.isBreak) {
                    brick.status = 0;
                    currentGameState.score += 500;
                    if(uiUpdateCallback) uiUpdateCallback();
                    handlePowerupDrop(brick, currentGameState);
                    if(checkLevelCompletionCallback) checkLevelCompletionCallback();
                    continue; // Break ball passes through
                } else {
                    const dxHit = ball.x - (brick.x + brick.width / 2);
                    const dyHit = ball.y - (brick.y + brick.height / 2);
                    if (Math.abs(dxHit) * brick.height > Math.abs(dyHit) * brick.width) {
                        ball.dx = -ball.dx;
                        ball.x += (ball.dx > 0 ? ball.radius : -ball.radius) * 1.1;
                    } else {
                        ball.dy = -ball.dy;
                        ball.y += (ball.dy > 0 ? ball.radius : -ball.radius) * 1.1;
                    }
                    return true; // Normal ball stops after hitting an unbreakable brick
                }
            } else { // Breakable brick
                if (ball.isBreak) {
                    brick.status = 0;
                    currentGameState.score += 10;
                    if(uiUpdateCallback) uiUpdateCallback();
                    handlePowerupDrop(brick, currentGameState);
                    if(checkLevelCompletionCallback) checkLevelCompletionCallback();
                    continue; // Break ball passes through
                } else {
                    brick.hp -= ball.damage;
                    if (brick.hp <= 0) {
                        brick.status = 0;
                        currentGameState.score += 10;
                        handlePowerupDrop(brick, currentGameState);
                        if(checkLevelCompletionCallback) checkLevelCompletionCallback();
                    }
                    if(uiUpdateCallback) uiUpdateCallback();
                    
                    const dxHit = ball.x - (brick.x + brick.width / 2);
                    const dyHit = ball.y - (brick.y + brick.height / 2);
                    if (Math.abs(dxHit) * brick.height > Math.abs(dyHit) * brick.width) {
                        ball.dx = -ball.dx;
                        ball.x += (ball.dx > 0 ? ball.radius : -ball.radius) * 1.1;
                    } else {
                        ball.dy = -ball.dy;
                        ball.y += (ball.dy > 0 ? ball.radius : -ball.radius) * 1.1;
                    }
                    return true; // Normal ball stops after hitting a breakable brick
                }
            }
        }
    }
    return anyBrickHit;
}

export function checkLaserBrickCollision(lasers, bricks, currentGameState, uiUpdateCallback, checkLevelCompletionCallback) {
    for (let l = lasers.length - 1; l >= 0; l--) {
        const laser = lasers[l];
        if (!laser.active) continue;

        for (let i = bricks.length - 1; i >= 0; i--) {
            const brick = bricks[i];
            if (brick.status === 1) {
                if (laser.x + laser.width / 2 > brick.x &&
                    laser.x - laser.width / 2 < brick.x + brick.width &&
                    laser.y < brick.y + brick.height && // Laser top edge hits brick bottom
                    laser.y + laser.height > brick.y) {  // Laser bottom edge hits brick top
                    
                    if (brick.isUnbreakable) {
                        brick.status = 0; 
                        currentGameState.score += 500;
                    } else {
                        brick.hp -= 1; // Lasers deal 1 damage
                        if (brick.hp <= 0) {
                            brick.status = 0;
                            currentGameState.score += 10;
                        }
                    }
                    if(uiUpdateCallback) uiUpdateCallback();
                    if (brick.status === 0) {
                         handlePowerupDrop(brick, currentGameState);
                         if(checkLevelCompletionCallback) checkLevelCompletionCallback();
                    }
                    laser.active = false; // Laser is destroyed after hitting any brick
                    break; // Laser hits one brick and is done
                }
            }
        }
    }
}

export function checkWallCollision(ball, canvas) {
    if (!ball.active) return false; // Not off bottom if not active

    const nextX = ball.x + ball.dx;
    const nextY = ball.y + ball.dy;

    if (nextX < ball.radius || nextX > canvas.width - ball.radius) {
        ball.dx = -ball.dx;
        ball.x = Math.max(ball.radius, Math.min(canvas.width - ball.radius, ball.x)); // Adjust to prevent sticking
    }
    if (nextY < ball.radius) {
        ball.dy = -ball.dy;
        ball.y = Math.max(ball.radius, ball.y); // Adjust
    }
    if (ball.y - ball.radius > canvas.height) { // Off bottom
        ball.active = false;
        ball.isOnPaddle = false;
        return true; // Indicates ball went off bottom
    }
    return false;
}

export function checkPaddleCollision(ball, currentGameState) {
    if (ball.active && !ball.isOnPaddle) {
        if (ball.y + ball.radius > paddle.y &&
            ball.y - ball.radius < paddle.y + paddle.height &&
            ball.x + ball.radius > paddle.x && // Consider ball radius for x-axis collision too
            ball.x - ball.radius < paddle.x + paddle.width) {

            if (currentGameState.paddleCatches) {
                ball.active = false;
                ball.isOnPaddle = true;
                ball.dx = 0;
                ball.dy = 0;
            } else {
                const hitPos = (ball.x - paddle.x) / paddle.width;
                const angle = (hitPos - 0.5) * Math.PI * 0.7;
                const currentSpeedMagnitude = settings.baseBallSpeed * currentGameState.activeSpeedModifier;

                ball.dx = Math.sin(angle) * currentSpeedMagnitude;
                ball.dy = -Math.cos(angle) * currentSpeedMagnitude;
                
                // Ensure minimum upward speed
                const minVerticalSpeed = settings.baseBallSpeed * 0.5 * currentGameState.activeSpeedModifier; 
                if (Math.abs(ball.dy) < minVerticalSpeed && ball.dy < 0) {
                     ball.dy = -minVerticalSpeed;
                } else if (ball.dy >= 0) { // Ensure it always goes up
                    ball.dy = -minVerticalSpeed;
                }

                ball.y = paddle.y - ball.radius; // Prevent sinking
            }
            return true;
        }
    }
    return false;
}

export function checkPowerupPaddleCollision(powerup, currentGameState, applyPowerupCallback, uiUpdateCallback) {
    // Simple AABB for powerup (center x, y) and paddle
    const powerupRadius = 15; // Approximate radius for collision
    if (powerup.y + powerupRadius > paddle.y &&
        powerup.y - powerupRadius < paddle.y + paddle.height &&
        powerup.x + powerupRadius > paddle.x &&
        powerup.x - powerupRadius < paddle.x + paddle.width) {
        
        applyPowerupCallback(powerup.type, currentGameState, uiUpdateCallback);
        return true; // Collision occurred, powerup should be removed
    }
    return false;
} 