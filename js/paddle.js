import { settings } from './constants.js';
import { gameState } from './game.js'; // Assuming gameState will provide paddleHasLaser, paddleCatches

export let paddle = {
    width: settings.paddleWidth,
    height: settings.paddleHeight,
    x: 0,
    y: 0,
    // isCatching: false, // This state will be part of gameState.paddleCatches
    // paddleHasLaser: false // This state will be part of gameState.paddleHasLaser
};

export function initPaddle(canvas) {
    paddle.width = settings.paddleWidth; // Reset to default
    paddle.x = (canvas.width - paddle.width) / 2;
    paddle.y = canvas.height - paddle.height - 20; // Standard offset from bottom
}

export function drawPaddle(ctx) {
    if (!ctx) return;

    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    // Change paddle color based on active powerup from gameState
    ctx.fillStyle = gameState.paddleHasLaser ? '#FF9800' : (gameState.paddleCatches ? '#E91E63' : '#FFFFFF');
    ctx.fill();

    // Draw paddle outline for definition
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.closePath();

    // Draw visual indicators (cannons) on the paddle if the Laser powerup is active.
    if (gameState.paddleHasLaser) {
        const cannonSize = 5;
        ctx.fillStyle = '#000000'; // Black cannons
        const inset = paddle.width * settings.laserXOffset;
        ctx.fillRect(paddle.x + inset - cannonSize / 2, paddle.y - cannonSize, cannonSize, cannonSize);
        ctx.fillRect(paddle.x + paddle.width - inset - cannonSize / 2, paddle.y - cannonSize, cannonSize, cannonSize);
    }
}

export function movePaddle(newX, canvasWidth) {
    paddle.x = newX;
    // Clamp paddle position to the bounds of the canvas width.
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvasWidth) paddle.x = canvasWidth - paddle.width;
}

// Function to adjust paddle width (for Extend powerup)
export function changePaddleWidth(amount, canvas) {
    const oldWidth = paddle.width;
    paddle.width = Math.max(settings.minPaddleWidth, Math.min(settings.maxPaddleWidth, paddle.width + amount));
    // Adjust paddle position to keep its center roughly the same after resizing
    const widthChange = paddle.width - oldWidth;
    paddle.x -= widthChange / 2;

    // Ensure paddle stays within canvas bounds after resize
    if (canvas) {
        if (paddle.x < 0) paddle.x = 0;
        if (paddle.x + paddle.width > canvas.width) paddle.x = canvas.width - paddle.width;
    }
}

export function resetPaddleWidth() {
    const oldWidth = paddle.width;
    paddle.width = settings.paddleWidth;
    const widthChange = paddle.width - oldWidth;
    paddle.x -= widthChange / 2; 
    // No canvas check needed here as it's a reset to default, assume x will be re-centered or is fine.
} 