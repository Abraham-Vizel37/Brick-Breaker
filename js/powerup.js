import { settings, powerupTypes, randomDroppableTypes } from './constants.js';
import { gameState } from './game.js'; // Corrected import: Use gameState directly
import { changePaddleWidth, resetPaddleWidth } from './paddle.js';
import { createNewBall, launchBall as launchSingleBall } from './ball.js'; // Renamed to avoid conflict
import { canvas } from './ui.js'; // For paddle width adjustment context

// Draws all active falling powerup objects.
export function drawPowerups(ctx, powerupsToDraw) { // Expects gameState.powerups
    if (!ctx) return;

    powerupsToDraw.forEach(powerup => {
        const capsuleWidth = 20;
        const capsuleHeight = 11;
        ctx.beginPath();
        ctx.rect(powerup.x - capsuleWidth / 2, powerup.y - capsuleHeight / 2, capsuleWidth, capsuleHeight);
        const powerupDef = powerupTypes.find(p => p.type === powerup.type);
        ctx.fillStyle = powerupDef ? powerupDef.color : '#FFFFFF';
        ctx.fill();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        let symbol = powerupDef ? powerupDef.symbol : '?';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const textY = powerup.y + 1;

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeText(symbol, powerup.x, textY);
        ctx.fillText(symbol, powerup.x, textY);

        ctx.closePath();
    });
}

// Moves a single powerup and returns true if it's off-screen.
export function movePowerup(powerup, canvasHeight) {
    powerup.y += powerup.dy;
    if (powerup.y - 15 > canvasHeight) {
        return true; // Off screen
    }
    return false;
}

// Handles determining if a powerup should drop and creates it.
export function handlePowerupDrop(brick, currentGameState) {
    console.log('[handlePowerupDrop] Called for destroyed brick at:', { x: brick.x, y: brick.y, powerupType: brick.powerupType }); // Log entry and brick info
    let newPowerup = null;
    let dropReason = 'No drop'; // For logging

    if (brick.powerupType) {
        console.log('[handlePowerupDrop] Dropping GUARANTEED powerup:', brick.powerupType);
        newPowerup = {
            x: brick.x + brick.width / 2,
            y: brick.y + brick.height / 2,
            type: brick.powerupType,
            dy: settings.powerupSpeed
        };
        dropReason = 'Guaranteed';
    } else {
        const lifeRoll = Math.random();
        console.log(`[handlePowerupDrop] Life roll: ${lifeRoll.toFixed(3)} (Threshold: ${settings.extraLifeDropChance})`);
        if (lifeRoll < settings.extraLifeDropChance) {
            console.log('[handlePowerupDrop] Dropping RANDOM Extra Life');
            newPowerup = {
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height / 2,
                type: 'extraLife',
                dy: settings.powerupSpeed
            };
            dropReason = 'Random Life';
        } else {
            const powerupRoll = Math.random();
            console.log(`[handlePowerupDrop] Powerup roll: ${powerupRoll.toFixed(3)} (Threshold: ${settings.randomPowerupChance})`);
            if (randomDroppableTypes.length > 0 && powerupRoll < settings.randomPowerupChance) {
                const randomPowerupDef = randomDroppableTypes[Math.floor(Math.random() * randomDroppableTypes.length)];
                console.log('[handlePowerupDrop] Dropping RANDOM powerup:', randomPowerupDef.type);
                newPowerup = {
                    x: brick.x + brick.width / 2,
                    y: brick.y + brick.height / 2,
                    type: randomPowerupDef.type,
                    dy: settings.powerupSpeed
                };
                dropReason = 'Random Other';
            } else {
                 console.log('[handlePowerupDrop] No random powerup drop triggered.');
            }
        }
    }

    if (newPowerup) {
        currentGameState.powerups.push(newPowerup);
        console.log(`[handlePowerupDrop] Pushed powerup (${dropReason}). Total powerups: ${currentGameState.powerups.length}`);
    } else {
        console.log('[handlePowerupDrop] No powerup created.');
    }
}

// Applies the effects of a collected powerup.
// This function will directly modify the gameState passed to it.
export function applyPowerup(type, currentGameState, updateHUDCallback) {
    console.log("Applying powerup:", type);
    const { balls } = currentGameState; // Destructure for easier access

    // Clear existing timeouts for conflicting/stacking powerups
    function clearSpeedModifier() {
        if (currentGameState.speedModifierTimeout) clearTimeout(currentGameState.speedModifierTimeout);
        currentGameState.speedModifierTimeout = null;
        currentGameState.activeSpeedModifier = 1.0;
    }
    function clearCatch() {
        if (currentGameState.catchTimeout) clearTimeout(currentGameState.catchTimeout);
        currentGameState.paddleCatches = false;
        currentGameState.catchTimeout = null;
    }
    function clearLaser() {
        if (currentGameState.laserTimeout) clearTimeout(currentGameState.laserTimeout);
        currentGameState.paddleHasLaser = false;
        currentGameState.lasers = []; // Clear active lasers
        // currentGameState.canShootLaser will be managed in game.js
        currentGameState.laserTimeout = null;
    }
    function clearBreak() {
        if (currentGameState.breakTimeout) clearTimeout(currentGameState.breakTimeout);
        balls.forEach(ball => { ball.isBreak = false; ball.damage = settings.ballDamage; });
        currentGameState.breakTimeout = null;
    }
    
    function releaseCaughtBalls() {
        balls.forEach(ball => {
            if (ball.isOnPaddle) launchSingleBall(ball); // Uses imported launchSingleBall
        });
    }

    switch (type) {
        case 'slowBall':
            clearSpeedModifier();
            currentGameState.activeSpeedModifier = settings.slowBallFactor;
            balls.forEach(ball => {
                if (ball.active) {
                    const speed = settings.baseBallSpeed * currentGameState.activeSpeedModifier;
                    const angle = Math.atan2(ball.dy, ball.dx);
                    ball.dx = Math.cos(angle) * speed;
                    ball.dy = Math.sin(angle) * speed;
                }
            });
            currentGameState.speedModifierTimeout = setTimeout(() => {
                clearSpeedModifier();
                 balls.forEach(ball => { // Readjust speed
                    if (ball.active) {
                        const speed = settings.baseBallSpeed * currentGameState.activeSpeedModifier;
                        const angle = Math.atan2(ball.dy, ball.dx);
                        ball.dx = Math.cos(angle) * speed;
                        ball.dy = Math.sin(angle) * speed;
                    }
                });
            }, settings.slowDuration);
            break;

        case 'fastBall':
            clearSpeedModifier();
            currentGameState.activeSpeedModifier = settings.fastBallFactor;
            balls.forEach(ball => {
                if (ball.active) {
                    const speed = settings.baseBallSpeed * currentGameState.activeSpeedModifier;
                    const angle = Math.atan2(ball.dy, ball.dx);
                    ball.dx = Math.cos(angle) * speed;
                    ball.dy = Math.sin(angle) * speed;
                }
            });
            currentGameState.speedModifierTimeout = setTimeout(() => {
                clearSpeedModifier();
                balls.forEach(ball => { // Readjust speed
                    if (ball.active) {
                        const speed = settings.baseBallSpeed * currentGameState.activeSpeedModifier;
                        const angle = Math.atan2(ball.dy, ball.dx);
                        ball.dx = Math.cos(angle) * speed;
                        ball.dy = Math.sin(angle) * speed;
                    }
                });
            }, settings.fastDuration);
            break;

        case 'multiBall':
            const activeBalls = balls.filter(b => b.active);
            if (activeBalls.length > 0) {
                activeBalls.forEach(ball => {
                    const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
                    const currentAngle = Math.atan2(ball.dy, ball.dx);
                    for (let i = 0; i < 2; i++) { // Create 2 new balls
                        const newBall = createNewBall(canvas); // Assumes canvas is available via import or passed
                        if(newBall){
                            newBall.x = ball.x;
                            newBall.y = ball.y;
                            newBall.isOnPaddle = false;
                            newBall.active = true;
                            newBall.isBreak = ball.isBreak;
                            newBall.damage = ball.damage;
                            const angleOffset = (i === 0 ? Math.PI / 6 : -Math.PI / 6);
                            const newAngle = currentAngle + angleOffset;
                            newBall.dx = Math.cos(newAngle) * speed;
                            newBall.dy = Math.sin(newAngle) * speed;
                            if (newBall.dy > -speed * 0.2) newBall.dy = -speed * 0.5; 
                            balls.push(newBall);
                        }
                    }
                });
            } else {
                const ballOnPaddle = balls.find(b => b.isOnPaddle);
                if (ballOnPaddle) {
                    launchSingleBall(ballOnPaddle);
                    for (let i = 0; i < 2; i++) {
                        const newBall = createNewBall(canvas);
                        if(newBall){
                            newBall.x = ballOnPaddle.x;
                            newBall.y = ballOnPaddle.y;
                            newBall.isOnPaddle = false;
                            newBall.active = true;
                            newBall.isBreak = ballOnPaddle.isBreak;
                            newBall.damage = ballOnPaddle.damage;
                            const angleOffset = (i === 0 ? Math.PI / 6 : -Math.PI / 6);
                            // Base new ball angles off the initially launched ball direction
                            const newAngle = Math.atan2(ballOnPaddle.dy, ballOnPaddle.dx) + angleOffset;
                            const speed = settings.baseBallSpeed * currentGameState.activeSpeedModifier;
                            newBall.dx = Math.cos(newAngle) * speed;
                            newBall.dy = Math.sin(newAngle) * speed;
                            if (newBall.dy > -speed*0.2) newBall.dy = -speed*0.5;
                            balls.push(newBall);
                        }
                    }
                } else if (balls.length === 0) { // No balls at all
                     for(let i = 0; i < 3; i++) {
                        const newBall = createNewBall(canvas);
                        if(newBall){
                            newBall.isOnPaddle = false;
                            newBall.active = true;
                            const angle = -Math.PI / 2 + (i - 1) * (Math.PI / 12); 
                            const speed = settings.baseBallSpeed * currentGameState.activeSpeedModifier;
                            newBall.dx = Math.cos(angle) * speed;
                            newBall.dy = Math.sin(angle) * speed;
                            balls.push(newBall);
                        }
                    }
                }
            }
            break;

        case 'widerPaddle':
            changePaddleWidth(30, canvas); // Pass canvas for boundary checks
            break;

        case 'laser':
            clearLaser(); // Clear its own potential existing timeout first
            clearCatch();
            clearBreak();
            currentGameState.paddleHasLaser = true;
            releaseCaughtBalls();
            currentGameState.laserTimeout = setTimeout(() => {
                clearLaser();
            }, settings.laserDuration);
            break;

        case 'catch':
            clearCatch(); // Clear its own potential existing timeout first
            clearLaser();
            clearBreak();
            currentGameState.paddleCatches = true;
            currentGameState.catchTimeout = setTimeout(() => {
                clearCatch();
                releaseCaughtBalls(); // Release any balls caught when it expires
            }, settings.powerupDuration); // General powerup duration for Catch
            break;

        case 'break':
            clearBreak(); // Clear its own potential existing timeout first
            clearLaser();
            clearCatch();
            balls.forEach(ball => {
                ball.isBreak = true;
                ball.damage = Infinity;
            });
            releaseCaughtBalls();
            currentGameState.breakTimeout = setTimeout(() => {
                clearBreak();
            }, settings.breakDuration);
            break;

        case 'extraLife':
            currentGameState.lives++;
            if(updateHUDCallback) updateHUDCallback();
            break;

        default:
            console.warn("Unknown powerup type collected:", type);
            break;
    }
}

// Clears all timed powerup effects and resets associated game state variables.
export function clearAllTimedPowerupEffects(currentGameState) {
    console.log("clearAllTimedPowerupEffects called");
    if (currentGameState.speedModifierTimeout) clearTimeout(currentGameState.speedModifierTimeout);
    if (currentGameState.catchTimeout) clearTimeout(currentGameState.catchTimeout);
    if (currentGameState.laserTimeout) clearTimeout(currentGameState.laserTimeout);
    if (currentGameState.breakTimeout) clearTimeout(currentGameState.breakTimeout);

    currentGameState.speedModifierTimeout = null;
    currentGameState.catchTimeout = null;
    currentGameState.laserTimeout = null;
    currentGameState.breakTimeout = null;

    currentGameState.activeSpeedModifier = 1.0;
    currentGameState.paddleCatches = false;
    currentGameState.paddleHasLaser = false;
    currentGameState.balls.forEach(ball => { ball.isBreak = false; ball.damage = settings.ballDamage; });
    currentGameState.lasers = [];

    resetPaddleWidth(); // Resets paddle width to default
} 