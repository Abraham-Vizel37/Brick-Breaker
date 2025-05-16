import { settings } from './constants.js';
import { paddle } from './paddle.js';
import { handlePowerupDrop } from './powerup.js';
import { playSound } from '../script.js';
// gameState and its properties (balls, bricks, lasers, powerups, score, lives, level, etc.) 
// will be passed as parameters to these collision functions.
// uiUpdateCallback will be a function to call updateHUD, updateFinalScore etc.

export function checkBrickCollision(ball, bricks, currentGameState, uiUpdateCallback, checkLevelCompletionCallback) {
    let anyBrickHit = false;
    
    for (let i = bricks.length - 1; i >= 0; i--) { // Iterate through ALL bricks
        const brick = bricks[i];
        if (brick.status === 1) { // Only check active bricks

            // Simple AABB check first for broad phase
            // (This initial check remains, but the response logic changes)
            const brickLeft = brick.x;
            const brickRight = brick.x + brick.width;
            const brickTop = brick.y;
            const brickBottom = brick.y + brick.height;

            // Find the closest point to the circle (ball) on the rectangle (brick)
            const closestX = Math.max(brickLeft, Math.min(ball.x, brickRight));
            const closestY = Math.max(brickTop, Math.min(ball.y, brickBottom));

            // Calculate the distance between the circle's center and this closest point
            const distanceX = ball.x - closestX;
            const distanceY = ball.y - closestY;
            const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

            // If the distance is less than the square of the circle's radius, a collision occurred
            if (distanceSquared < (ball.radius * ball.radius)) {
            
                anyBrickHit = true;

                playSound('brickHit');

                // --- Animation Trigger ---
                if (brick.isUnbreakable || (brick.originalColor === '#BCBCBC' && brick.maxHp > 1)) {
                    brick.isHitAnimating = true;
                    brick.hitAnimationStartTime = performance.now();
                }
                // --- End Animation Trigger ---

                // --- Collision Response --- (Refined Bounce based on Normal)
                
                // Calculate the distance from the ball center to the closest point on the brick border.
                // This distance squared is already calculated (distanceSquared).

                // If the distance is less than the square of the circle's radius, a collision occurred
                // The closest point logic inherently handles corners and sides.
                // Special handling for distanceSquared === 0 (ball center exactly at closest point, likely inside brick)
                 if (distanceSquared === 0) {
                     // Ball is inside the brick. Attempt to push it out along its reversed velocity direction
                     // or a default direction if velocity is zero.
                     const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                     if (speed > 0) {
                        // Push out along reversed velocity vector
                        const pushAmount = ball.radius; // Push out at least ball radius
                        ball.x -= (ball.dx / speed) * pushAmount;
                        ball.y -= (ball.dy / speed) * pushAmount;

                         // Then apply a standard reflection based on the *original* dominant axis of velocity
                         // This is still a fallback for deep overlap, aiming for a reasonable bounce.
                         if (Math.abs(ball.dx) > Math.abs(ball.dy)) {
                             ball.dx = -ball.dx;
                         } else {
                             ball.dy = -ball.dy;
                         }

                     } else { // Speed is zero (ball perfectly centered or stuck)
                         // Apply a default upward push and vertical bounce
                         ball.y -= ball.radius * 2; // Nudge upwards
                         ball.dy = -ball.dy || -settings.baseBallSpeed; // Reverse vertical or set default speed
                     }

                 } else { // Standard collision - distanceSquared > 0
                     const distance = Math.sqrt(distanceSquared);
                     // Collision normal is the vector from closestPoint to ball center, normalized
                     const normalX = distanceX / distance;
                     const normalY = distanceY / distance;

                     // Reflect the ball's velocity using the collision normal
                     const dotProduct = ball.dx * normalX + ball.dy * normalY;
                     ball.dx = ball.dx - 2 * dotProduct * normalX;
                     ball.dy = ball.dy - 2 * dotProduct * normalY;

                     // Position correction: Move ball out of the brick along the normal
                     const overlap = ball.radius - distance;
                     const minPush = 0.1; // A small buffer to ensure separation
                     const pushAmount = overlap + minPush; // Push out by overlap plus a small buffer
                     ball.x += normalX * pushAmount;
                     ball.y += normalY * pushAmount;
                 }
                 
                let bounced = true; // Collision was handled, considered bounced for state update

                // --- Brick State Update & Powerup Drop ---
                if (brick.isUnbreakable) {
                    if (ball.isBreak) {
                         brick.status = 0; // Break ball destroys unbreakable
                         currentGameState.score += 500;
                         if(uiUpdateCallback) uiUpdateCallback();
                         handlePowerupDrop(brick, currentGameState);
                         if(checkLevelCompletionCallback) checkLevelCompletionCallback();
                    }
                    // Normal ball just bounces off unbreakable bricks (handled by reflection above)

                } else { // Breakable brick
                    if (ball.isBreak) {
                         brick.status = 0; // Break ball destroys breakable
                         currentGameState.score += 10;
                         if(uiUpdateCallback) uiUpdateCallback();
                         handlePowerupDrop(brick, currentGameState);
                         if(checkLevelCompletionCallback) checkLevelCompletionCallback();
                    } else {
                        brick.hp -= ball.damage; // Normal ball damages breakable
                        if (brick.hp <= 0) {
                            brick.status = 0;
                            currentGameState.score += 10;
                            handlePowerupDrop(brick, currentGameState);
                            if(checkLevelCompletionCallback) checkLevelCompletionCallback();
                        }
                        if(uiUpdateCallback) uiUpdateCallback();
                    }
                }
                
                // For non-break balls, only one brick is hit per frame and we stop checking
                if (!ball.isBreak) {
                     return true; // Indicate a collision was handled and ball bounced
                }
            }
        }
    }
    return anyBrickHit; // Returns true if *any* brick was hit (useful for break balls)
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

    let bounced = false;

    // Check horizontal walls
    if (nextX < ball.radius) {
        ball.dx = -ball.dx;
        ball.x = ball.radius; // Adjust position to prevent sticking
        bounced = true;
    } else if (nextX > canvas.width - ball.radius) {
        ball.dx = -ball.dx;
        ball.x = canvas.width - ball.radius; // Adjust position
        bounced = true;
    }

    // Check top wall
    if (nextY < ball.radius) {
        ball.dy = -ball.dy;
        ball.y = ball.radius; // Adjust position
        bounced = true;
    }

    // Check bottom edge (life loss)
    if (ball.y - ball.radius > canvas.height) { // Ball has moved entirely off the bottom
        ball.active = false;
        ball.isOnPaddle = false;
        return true; // Indicates ball went off bottom
    }
    
    // If a bounce occurred on a wall (not off bottom), play sound
    if (bounced && ball.active) {
       // playSound('wallBounce'); // Sound handled by game logic or a central sound manager if needed
    }

    return false; // Indicate if ball went off bottom
}

export function checkPaddleCollision(ball, currentGameState) {
    if (ball.active && !ball.isOnPaddle) {
        // Simplified AABB check with ball radius consideration
        if (ball.y + ball.radius > paddle.y &&
            ball.y - ball.radius < paddle.y + paddle.height &&
            ball.x + ball.radius > paddle.x && 
            ball.x - ball.radius < paddle.x + paddle.width) {

            // --- Collision Detected with Paddle ---

            // Reposition ball just above paddle to prevent sinking/phasing
            // Use a small epsilon nudge to ensure it's clearly outside
            ball.y = paddle.y - ball.radius - 0.1; // Reposition consistently

            if (currentGameState.paddleCatches) {
               // ... existing catch logic (commented out state changes) ...
               // State changes like active=false, isOnPaddle=true are handled in calling code based on return
               // Setting them here directly means this function fully handles the catch
               ball.active = false;
               ball.isOnPaddle = true;
               ball.dx = 0;
               ball.dy = 0;
               // playSound('paddleCatch'); // Sound handled by applyPowerup or game logic
               return true; // Indicate collision and catch
            } else {
               // ... existing bounce calculation ...
               const hitPos = (ball.x - paddle.x) / paddle.width; // 0 = left edge, 1 = right edge
               const angle = (hitPos - 0.5) * Math.PI * 0.7; // Angle from -0.35pi to 0.35pi
               const currentSpeedMagnitude = settings.baseBallSpeed * currentGameState.activeSpeedModifier;

               ball.dx = Math.sin(angle) * currentSpeedMagnitude;
               ball.dy = -Math.cos(angle) * currentSpeedMagnitude;
                
               // Ensure minimum upward speed to prevent horizontal sticking
               const minVerticalSpeed = settings.baseBallSpeed * 0.5 * currentGameState.activeSpeedModifier; 
               if (Math.abs(ball.dy) < minVerticalSpeed) {
                    ball.dy = ball.dy < 0 ? -minVerticalSpeed : minVerticalSpeed; // Maintain original direction
               }

               // playSound('paddleBounce'); // Sound handled by game logic or a central sound manager if needed
               return true; // Indicate collision and bounce
            }
        }
    }
    return false; // No collision
}

export function checkPowerupPaddleCollision(powerup, currentGameState, applyPowerupCallback, uiUpdateCallback) {
    // Simple AABB for powerup (center x, y) and paddle
    const powerupHalfWidth = 20 / 2; // Powerup width from drawPowerups
    const powerupHalfHeight = 11 / 2; // Powerup height from drawPowerups

    // Check for overlap
    if (powerup.x + powerupHalfWidth > paddle.x &&
        powerup.x - powerupHalfWidth < paddle.x + paddle.width &&
        powerup.y + powerupHalfHeight > paddle.y &&
        powerup.y - powerupHalfHeight < paddle.y + paddle.height) {
        
        // Collision occurred
        applyPowerupCallback(powerup.type, currentGameState, uiUpdateCallback);
        // playSound('powerupCatch'); // Sound handled by applyPowerup or game logic
        return true; // Collision occurred, powerup should be removed
    }
    return false; // No collision
} 