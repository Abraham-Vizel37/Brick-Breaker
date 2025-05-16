import { settings } from './constants.js';
import { paddle } from './paddle.js';
import { handlePowerupDrop } from './powerup.js';
import { playSound } from '../script.js';
import { gameState } from './game.js'; // Assuming gameState is needed for powerup drops
// gameState and its properties (balls, bricks, lasers, powerups, score, lives, level, etc.) 
// will be passed as parameters to these collision functions.
// uiUpdateCallback will be a function to call updateHUD, updateFinalScore etc.

// Helper function to map brick type values (1-8) to their corresponding color from the current palette. (Moved to brick.js)
// function getStandardBrickColor(typeValue, currentPalette) { ... }

// Helper function to darken a given hex color by a specified amount (0-1). (Moved to brick.js)
// function darkenColor(color, amount) { ... }

// Helper function to lighten a given hex color by a specified amount (0-1). (Moved to brick.js)
// function lightenColor(hex, percent) { ... }

// Updated function to draw a diagonal sweep animation, with special handling for silver bricks (Moved to brick.js)
// function drawMetallicSweepAnimation(ctx, brick, animationProgress, baseAppearanceColor, isSilverSpecialAnimation) { ... }

// Helper to handle powerup dropping (This function is imported from powerup.js, remove local declaration)
// function handlePowerupDrop(brick, currentGameState) { ... }

// Refined checkBrickCollision function
export function checkBrickCollision(ball, bricks, currentGameState, uiUpdateCallback, checkLevelCompletionCallback) {
    let anyBrickHit = false;
    const hitBricks = new Set(); // Use a Set to store unique bricks hit in this frame

    // Iterate through all bricks to find potential collisions
    for (let i = bricks.length - 1; i >= 0; i--) { 
        const brick = bricks[i];
        if (brick.status === 1) { // Only check active bricks

            // Calculate the closest point to the circle (ball) on the rectangle (brick)
            const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
            const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));

            // Calculate the distance between the circle's center and this closest point
            const distanceX = ball.x - closestX;
            const distanceY = ball.y - closestY;
            const distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

            // If the distance is less than the square of the circle's radius, a collision occurred
            if (distanceSquared < (ball.radius * ball.radius)) {
                // Collision detected with this brick
                
                // --- Collision Response & State Update ---

                // If the ball is a break ball, it hits the brick but doesn't bounce normally.
                // It destroys the brick and continues.
                if (ball.isBreak) {
                    // Process the current brick hit
                    if (brick.isUnbreakable) {
                         brick.status = 0; 
                         currentGameState.score += 500;
                    } else { 
                         brick.status = 0;
                         currentGameState.score += 10;
                    }
                    if(uiUpdateCallback) uiUpdateCallback();
                    handlePowerupDrop(brick, currentGameState);
                    if(checkLevelCompletionCallback) checkLevelCompletionCallback();
                    anyBrickHit = true; // Mark that a brick was hit

                } else { // Standard ball collision (types 1-10)
                    playSound('brickHit');

                    // --- Animation Trigger ---
                    if (brick.isUnbreakable || (brick.originalColor === '#BCBCBC' && brick.maxHp > 1)) {
                         brick.isHitAnimating = true;
                         brick.hitAnimationStartTime = performance.now();
                    }
                    // --- End Animation Trigger ---

                    // Calculate collision normal (vector from closest point on brick to ball center)
                    const distance = Math.sqrt(distanceSquared);
                    let normalX = 0;
                    let normalY = 0;

                    if (distance > 0) { // Avoid division by zero if ball center is exactly on closest point
                         normalX = distanceX / distance;
                         normalY = distanceY / distance;
                    } else { // Ball is exactly at the closest point (e.g., started inside)
                        // This is a fallback; ideally position correction prevents this.
                        // Use a simple upward normal for now.
                        normalY = -1;
                    }

                    // Reflect the ball's velocity using the collision normal
                    const dotProduct = ball.dx * normalX + ball.dy * normalY;
                    // Only reflect if the ball is moving towards the brick
                    if (dotProduct < 0) {
                        ball.dx = ball.dx - 2 * dotProduct * normalX;
                        ball.dy = ball.dy - 2 * dotProduct * normalY;
                    }

                    // Position correction: Move ball out of the brick along the normal
                    const overlap = ball.radius - distance;
                    // Ensure overlap is positive if a collision occurred
                    if (overlap > 0) {
                         const pushAmount = overlap + 0.1; // Push out by overlap plus a small buffer
                         ball.x += normalX * pushAmount;
                         ball.y += normalY * pushAmount;
                    }

                    // Process the current brick hit (HP loss, powerup, etc.)
                    if (brick.isUnbreakable) {
                       // Normal ball bounces off unbreakable, no HP loss or status change
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

                    // For non-break balls, we stop after the first hit that causes a bounce.
                    return true; 
                }
            }
        }
    }

    // If the loop finishes without a standard ball hitting a brick,
    // check level completion based on any bricks potentially destroyed by break balls.
    // The logic for break balls already calls handlePowerupDrop and checkLevelCompletionCallback individually.
    // We only need to return if any brick was hit at all (for the game loop caller).
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

    return bounced;
}

export function checkPaddleCollision(ball, currentGameState) {
    // Use the imported paddle object directly, not from gameState
    // const paddle = currentGameState.paddle; // Removed

    // Simplified AABB check with ball radius consideration
    if (ball.active && !ball.isOnPaddle) {
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
    // const paddle = currentGameState.paddle; // Removed this line

    // Simple AABB collision detection
    if (powerup.x < paddle.x + paddle.width &&
        powerup.x + powerup.width > paddle.x &&
        powerup.y < paddle.y + paddle.height &&
        powerup.y + powerup.height > paddle.y) {
        
        // Collision detected with paddle
        // console.log("Powerup collected:", powerup.type);
        applyPowerupCallback(powerup.type, currentGameState);
        if(uiUpdateCallback) uiUpdateCallback();
        // playSound('powerupCollect'); // Assuming sound exists
        return true; // Indicate powerup collected
    }
    return false; // No collision
} 