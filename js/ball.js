import { settings } from './constants.js';
import { paddle } from './paddle.js'; // For initial ball position
import { gameState } from './game.js'; // For activeSpeedModifier and ball properties

// Creates a new ball object with default properties.
export function createNewBall(canvas) {
    if (!canvas) {
        console.error("Canvas element not found in createNewBall!");
        return null;
    }
    return {
        x: paddle.x + paddle.width / 2, // Start centered on the paddle
        y: paddle.y - settings.ballRadius, // Start just above paddle
        dx: 0, 
        dy: 0,
        radius: settings.ballRadius,
        damage: settings.ballDamage, 
        active: false, 
        isOnPaddle: true, 
        isBreak: false 
    };
}

// Draws all active ball objects on the canvas.
export function drawBalls(ctx, balls) { // Expects the balls array from gameState
    if (!ctx) return;

    balls.forEach(ball => {
        if (ball.active || ball.isOnPaddle) {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = ball.isBreak 
                ? '#FF4500' 
                : (gameState.activeSpeedModifier > 1.0 
                    ? '#FFFF00' 
                    : (gameState.activeSpeedModifier < 1.0 
                        ? '#AED6F1' 
                        : '#FFFFFF'));
            ctx.fill();

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.closePath();
        }
    });
}

// Update ball position if it's on the paddle (to keep it synced with paddle movement)
export function syncBallWithPaddle(ball) {
    if (ball.isOnPaddle) {
        ball.x = paddle.x + paddle.width / 2;
        ball.y = paddle.y - ball.radius;
    }
}

// Launch a specific ball from the paddle
export function launchBall(ball) {
    if (ball.isOnPaddle) {
        ball.isOnPaddle = false;
        ball.active = true;
        ball.dy = -(settings.baseBallSpeed * gameState.activeSpeedModifier);
        ball.dx = (Math.random() > 0.5 ? 1 : -1) * (settings.baseBallSpeed * gameState.activeSpeedModifier * 0.4);
    }
} 