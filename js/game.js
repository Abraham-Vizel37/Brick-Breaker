import { settings, colorPalettes } from './constants.js';
import { initBricks, drawBricks } from './brick.js';
import { initPaddle, paddle, drawPaddle, movePaddle, resetPaddleWidth } from './paddle.js';
import { createNewBall, drawBalls, syncBallWithPaddle, launchBall } from './ball.js';
import { drawPowerups, movePowerup, applyPowerup, clearAllTimedPowerupEffects } from './powerup.js';
import { drawLasers, createLaserBeam, moveLaser } from './laser.js';
import { checkBrickCollision, checkLaserBrickCollision, checkWallCollision, checkPaddleCollision, checkPowerupPaddleCollision } from './collision.js';
import *
as UI from './ui.js';

// --- Game State ---
// Exporting gameState directly allows other modules (like paddle.js, ball.js) to read it.
// Modifications should ideally happen through functions within this module.
export let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    gameRunning: false,
    paused: false,
    bricks: [],
    powerups: [],
    balls: [],
    lasers: [],
    activeSpeedModifier: 1.0,
    speedModifierTimeout: null,
    paddleCatches: false,
    catchTimeout: null,
    paddleHasLaser: false,
    laserTimeout: null,
    breakTimeout: null,
    boss: { exists: false, hp: 0, maxHp: 0, brick: null }, // Kept structure
    developerMode: false,
    currentColorPaletteIndex: 0,
    currentPalette: null,
    currentLevelConcept: "Classic Style",
    // --- Internal Game Loop State ---
    _animationFrameId: null,
    _canShootLaser: true,
    _lastTouchX: 0 // For paddle touch control
};

// --- Local Storage Keys ---
const HIGH_SCORE_KEY = 'brickBreakerHighScores';
const DEV_MODE_KEY = 'developerMode';

// --- Game Initialization and Lifecycle ---

function resetGameState() {
    gameState.score = 0;
    gameState.lives = 3;
    gameState.gameRunning = false;
    gameState.paused = false;
    gameState.bricks = [];
    gameState.powerups = [];
    gameState.balls = [];
    gameState.lasers = [];
    gameState.activeSpeedModifier = 1.0;
    gameState.paddleCatches = false;
    gameState.paddleHasLaser = false;
    clearAllTimedPowerupEffects(gameState); // Clear any residual timeouts/effects
    if (gameState._animationFrameId) {
        cancelAnimationFrame(gameState._animationFrameId);
        gameState._animationFrameId = null;
    }
}

function resetBallOnPaddle() {
    clearAllTimedPowerupEffects(gameState);
    gameState.balls = [createNewBall(UI.canvas)]; // Create one ball
    if (!gameState.balls[0]) {
        console.error("Failed to create initial ball.");
        gameOver(); // End game if ball creation fails
        return;
    }
    // Initial positioning is handled by createNewBall using paddle state
    resetPaddleWidth(); // Ensure paddle is default width
}

export function startGameAtLevel(levelNumber) {
    console.log("startGameAtLevel called for level:", levelNumber);
    resetGameState(); // Reset score, lives, objects, flags
    gameState.level = levelNumber;
    gameState.gameRunning = true;
    gameState.paused = false;
    
    // Select color palette
    gameState.currentColorPaletteIndex = (levelNumber - 1) % colorPalettes.length; 
    gameState.currentPalette = colorPalettes[gameState.currentColorPaletteIndex];

    initCanvasAndPaddle(); // Initialize canvas size and paddle position
    gameState.bricks = initBricks(UI.canvas, gameState); // Initialize bricks for the level
    resetBallOnPaddle(); // Place ball on paddle

    if (gameState.bricks.length === 0 && gameState.level <= settings.totalLevelsCount) {
         console.error(`Level ${gameState.level} loaded with zero bricks. Check level data.`);
         // Optionally, show an error or try next level?
         gameOver("Level Load Error");
         return;
    }

    UI.updateHUD();
    UI.showScreen(null); // Hide all overlay screens

    gameLoop(); // Start the animation loop
    console.log("Game loop started.");
}

export function restartLevel() {
    console.log("restartLevel called for level:", gameState.level);
    // Preserve score and lives, reset level state
    const currentScore = gameState.score;
    const currentLives = gameState.lives;
    const currentLevel = gameState.level;
    const devMode = gameState.developerMode; // Preserve dev mode status

    resetGameState(); // Resets most things

    // Restore preserved state
    gameState.score = currentScore;
    gameState.lives = currentLives;
    gameState.level = currentLevel;
    gameState.developerMode = devMode;
    gameState.gameRunning = true;
    gameState.paused = false;

    // Re-initialize elements for the current level
    initCanvasAndPaddle(); 
    gameState.bricks = initBricks(UI.canvas, gameState); 
    resetBallOnPaddle();

    UI.updateHUD();
    UI.showScreen(null); // Hide pause/other screens

    gameLoop(); 
    console.log("Game loop restarted.");
}

function startNextLevel() {
    console.log("startNextLevel called");
    clearAllTimedPowerupEffects(gameState);
    gameState.level++;
    gameState.powerups = [];
    gameState.balls = [];
    gameState.lasers = [];

    if (gameState.level > settings.totalLevelsCount) {
        console.log("All levels completed!");
        gameState.gameRunning = false;
        UI.updateLevelCompleteMessage(); // Special message for all levels done
        UI.showScreen(UI.winScreen);
        return;
    }

    // Cycle color palette
    if (gameState.level > 1 && (gameState.level - 1) % 5 === 0) {
        gameState.currentColorPaletteIndex = (gameState.currentColorPaletteIndex + 1) % colorPalettes.length;
        gameState.currentPalette = colorPalettes[gameState.currentColorPaletteIndex];
    }

    initCanvasAndPaddle(); // Re-init in case of resize between levels
    gameState.bricks = initBricks(UI.canvas, gameState);
    resetBallOnPaddle();

    UI.updateHUD();
    UI.showScreen(null); // Hide win screen
    gameState.gameRunning = true;
    gameLoop();
}

function gameOver(reason = "No lives left") {
    console.log(`gameOver called: ${reason}`);
    gameState.gameRunning = false;
    clearAllTimedPowerupEffects(gameState);
    if (gameState._animationFrameId) {
        cancelAnimationFrame(gameState._animationFrameId);
        gameState._animationFrameId = null;
    }

    let playerName = "???";
    // Use prompt for simplicity, consider HTML input for better UX
    const input = prompt(`Game Over! ${reason}. Enter your 3 initials:`);
    if (input) {
        playerName = input.replace(/[^A-Za-z0-9]/g, '').substring(0, 3).toUpperCase();
        if (playerName.length < 3) playerName = "???"; // Default if invalid
    } 

    saveHighScore(gameState.score, playerName);
    UI.updateFinalScore();
    UI.showScreen(UI.gameOverScreen);
}

function pauseGame() {
    if (gameState.gameRunning && !gameState.paused) {
        gameState.paused = true;
        if (gameState._animationFrameId) {
            cancelAnimationFrame(gameState._animationFrameId);
            gameState._animationFrameId = null;
        }
        UI.showScreen(UI.pauseScreen);
        console.log("Game paused.");
    }
}

function resumeGame() {
    if (gameState.gameRunning && gameState.paused) {
        gameState.paused = false;
        UI.showScreen(null); // Hide pause screen
        gameLoop(); // Restart the loop
        console.log("Game resumed.");
    }
}

// --- Game Loop ---

function gameLoop() {
    if (!gameState.gameRunning || gameState.paused) {
        if (gameState._animationFrameId) cancelAnimationFrame(gameState._animationFrameId);
        gameState._animationFrameId = null;
        return; 
    }

    // 1. Clear Canvas
    if (!UI.ctx || !UI.canvas) {
        console.error("Canvas or context missing in gameLoop!");
        gameState.gameRunning = false;
        return;
    }
    UI.ctx.clearRect(0, 0, UI.canvas.width, UI.canvas.height);

    // 2. Update Game Objects
    updateBalls();
    updatePowerups();
    updateLasers();

    // 3. Check Collisions
    checkAllCollisions();

    // 4. Draw Game Objects
    drawGameElements();

    // 5. Check Game State (Win/Loss conditions)
    // (Loss condition checked within updateBalls)
    // (Win condition checked within collision handling)

    // 6. Request Next Frame
    gameState._animationFrameId = requestAnimationFrame(gameLoop);
}

// --- Update Functions (Called by Game Loop) ---

function updateBalls() {
    let ballLost = false;
    for (let i = gameState.balls.length - 1; i >= 0; i--) {
        const ball = gameState.balls[i];
        if (ball.isOnPaddle) {
            syncBallWithPaddle(ball);
        } else if (ball.active) {
            ball.x += ball.dx;
            ball.y += ball.dy;
            if (checkWallCollision(ball, UI.canvas)) {
                ballLost = true;
            }
        } else { // Ball is inactive and not on paddle (e.g., just went off screen)
            gameState.balls.splice(i, 1);
        }
    }

    // Handle life loss *after* iterating through all balls
    if (ballLost && gameState.balls.every(b => !b.active && !b.isOnPaddle)) {
         handleLifeLoss();
    }
}

function updatePowerups() {
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        if (movePowerup(powerup, UI.canvas.height)) { // movePowerup returns true if off-screen
            gameState.powerups.splice(i, 1);
        }
    }
}

function updateLasers() {
    for (let i = gameState.lasers.length - 1; i >= 0; i--) {
        const laser = gameState.lasers[i];
        moveLaser(laser);
        if (!laser.active) {
            gameState.lasers.splice(i, 1);
        }
    }
}

// --- Collision Handling (Called by Game Loop) ---

function checkAllCollisions() {
    // Ball vs Bricks, Paddle, Walls (Walls checked in updateBalls)
    gameState.balls.forEach(ball => {
        if (ball.active && !ball.isOnPaddle) {
            if(checkBrickCollision(ball, gameState.bricks, gameState, UI.updateHUD, checkLevelCompletion)){
                // If brick collision returns true (ball hit), don't check paddle in same frame?
                // Or adjust position slightly more aggressively?
                // For now, let paddle check proceed.
            }
            checkPaddleCollision(ball, gameState);
        }
    });

    // Powerup vs Paddle
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        if (checkPowerupPaddleCollision(gameState.powerups[i], gameState, applyPowerup, UI.updateHUD)) {
            gameState.powerups.splice(i, 1); // Remove collected powerup
        }
    }

    // Laser vs Bricks
    checkLaserBrickCollision(gameState.lasers, gameState.bricks, gameState, UI.updateHUD, checkLevelCompletion);
}

function checkLevelCompletion() {
     const remainingBreakableBricks = gameState.bricks.filter(b => b.status === 1 && !b.isUnbreakable);
     if (gameState.gameRunning && remainingBreakableBricks.length === 0) {
         gameState.gameRunning = false; // Stop updates temporarily
         if (gameState.level >= settings.totalLevelsCount) {
            console.log("Final level cleared!");
            UI.updateLevelCompleteMessage(); 
            UI.showScreen(UI.winScreen);
            // Special handling for completing the *last* level (maybe different screen or message)
         } else {
            console.log(`Level ${gameState.level} cleared!`);
            UI.updateLevelCompleteMessage(); 
            UI.showScreen(UI.winScreen); // Show standard win screen
            // nextLevelBtn listener in setupEventListeners will call startNextLevel
         }
         return true;
     }
     return false;
}

function handleLifeLoss() {
    console.log("Life lost.");
    gameState.lives--;
    UI.updateHUD();
    if (gameState.lives <= 0) {
        gameOver();
    } else {
        resetBallOnPaddle(); // Reset ball, paddle, effects
    }
}

// --- Drawing (Called by Game Loop) ---

function drawGameElements() {
    if (!UI.ctx) return;
    drawBricks(UI.ctx, gameState.bricks);
    drawPaddle(UI.ctx);
    drawBalls(UI.ctx, gameState.balls);
    drawPowerups(UI.ctx, gameState.powerups);
    drawLasers(UI.ctx, gameState.lasers);
}

// --- Input Handling ---

let isMouseMovingPaddle = false;

function handlePaddleMove(clientX) {
    const rect = UI.canvas.getBoundingClientRect();
    const scaleX = UI.canvas.width / rect.width;
    let newX = (clientX - rect.left) * scaleX - paddle.width / 2; // Center paddle on cursor/touch
    movePaddle(newX, UI.canvas.width);
}

function handleCanvasClickOrTouch(e) {
    if (e.type === 'touchstart') e.preventDefault(); // Prevent scrolling/zooming
    if (!gameState.gameRunning || gameState.paused) return;

    const ballsOnPaddle = gameState.balls.filter(b => b.isOnPaddle);
    if (ballsOnPaddle.length > 0) {
        ballsOnPaddle.forEach(ball => launchBall(ball));
    } else if (gameState.paddleHasLaser) {
        shootLaser();
    }

    if (e.type === 'touchstart' && e.touches.length > 0) {
         gameState._lastTouchX = e.touches[0].clientX;
    } else if (e.type === 'mousedown') {
        isMouseMovingPaddle = true; // Start moving paddle with mouse
        handlePaddleMove(e.clientX);
    }
}

function handleCanvasMouseMove(e) {
    if (isMouseMovingPaddle && gameState.gameRunning && !gameState.paused) {
         handlePaddleMove(e.clientX);
    }
}

function handleCanvasMouseUpOrLeave(e) {
     isMouseMovingPaddle = false; 
}

function handleCanvasTouchMove(e) {
    e.preventDefault();
    if (!gameState.gameRunning || gameState.paused || e.touches.length === 0) return;
    
    const touchX = e.touches[0].clientX;
    const dx = touchX - gameState._lastTouchX;
    movePaddle(paddle.x + dx, UI.canvas.width); // Move paddle incrementally based on touch delta
    gameState._lastTouchX = touchX;
}

function handleResize() {
    console.log("handleResize called");
    const wasRunning = gameState.gameRunning && !gameState.paused;
    
    if (wasRunning) {
        pauseGame(); // Pause if running
    }

    initCanvasAndPaddle(); // Recalculate sizes

    // Re-initialize bricks only if the game was active (running or paused)
    if (gameState.gameRunning || gameState.paused) { 
        console.log("Re-initializing bricks due to resize.");
        gameState.bricks = initBricks(UI.canvas, gameState); 
    }

    // Don't automatically resume, let the user do it from the pause menu
    // If it wasn't running before, it stays not running.
    // If it was running, it's now paused.
    drawGameElements(); // Redraw immediately with new dimensions if paused/stopped
    UI.updateHUD(); // Update HUD positions/values if needed
}

function initCanvasAndPaddle() {
    if (!UI.canvas) return;

    // Change the target aspect ratio to a mobile-like shape (e.g., 9:16 width:height)
    const targetAspectRatio = 9 / 16; // Desired width / height ratio (e.g., 9:16)

    // Get the dimensions of the container or the available space from CSS
    const containerWidth = UI.canvas.offsetWidth;
    const containerHeight = UI.canvas.offsetHeight;

    let newCanvasWidth;
    let newCanvasHeight;

    // Calculate dimensions based on fitting within the container while maintaining the aspect ratio
    // We want: newCanvasWidth / newCanvasHeight = targetAspectRatio
    // newCanvasHeight = newCanvasWidth / targetAspectRatio
    // newCanvasWidth = newCanvasHeight * targetAspectRatio

    // Option 1: Assume width is the constraint, calculate height
    const heightBasedOnWidth = containerWidth / targetAspectRatio;

    if (heightBasedOnWidth <= containerHeight) {
        // Fitting based on width results in a height that fits the container
        newCanvasWidth = containerWidth;
        newCanvasHeight = heightBasedOnWidth;
    } else {
        // Fitting based on height is required (width based on height exceeds container width)
        newCanvasHeight = containerHeight;
        newCanvasWidth = containerHeight * targetAspectRatio;
    }

    // Set the internal drawing buffer size of the canvas
    UI.canvas.width = newCanvasWidth;
    UI.canvas.height = newCanvasHeight;

    // Initialize paddle position based on the new canvas size
    initPaddle(UI.canvas);

    console.log("Canvas initialized with mobile-like ratio:", UI.canvas.width, UI.canvas.height);
}

// --- Laser Shooting ---
function shootLaser() {
    if (gameState.gameRunning && gameState.paddleHasLaser && gameState._canShootLaser) {
        gameState.lasers.push(createLaserBeam(true)); // Left
        gameState.lasers.push(createLaserBeam(false)); // Right

        gameState._canShootLaser = false;
        setTimeout(() => {
            gameState._canShootLaser = true;
        }, settings.laserFireRate);
    }
}

// --- Persistence (High Scores & Dev Mode) ---

function saveHighScore(score, name) {
    let highScores = loadHighScores(); // Load existing scores first
    highScores.push({ score: Number(score), date: new Date().toLocaleDateString(), name: name });
    highScores.sort((a, b) => (b.score || 0) - (a.score || 0));
    highScores = highScores.slice(0, 5); // Keep top 5
    try {
        localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(highScores));
    } catch (error) {
        console.error("Error saving high scores:", error);
    }
}

function loadHighScores() {
    let highScores = [];
    try {
        const storedScores = localStorage.getItem(HIGH_SCORE_KEY);
        if (storedScores) {
            highScores = JSON.parse(storedScores);
        }
        if (!Array.isArray(highScores)) highScores = []; // Reset if corrupted
        // Filter out invalid entries
        highScores = highScores.filter(entry => 
            entry && typeof entry.score === 'number' && typeof entry.date === 'string' && typeof entry.name === 'string'
        );
    } catch (error) {
        console.error("Error parsing high scores:", error);
        highScores = [];
    }
    return highScores;
}

function saveDeveloperMode() {
    try {
        localStorage.setItem(DEV_MODE_KEY, gameState.developerMode);
    } catch (error) {
        console.error("Error saving dev mode state:", error);
    }
}

function loadDeveloperMode() {
    try {
        const devMode = localStorage.getItem(DEV_MODE_KEY);
        gameState.developerMode = (devMode === 'true');
    } catch (error) { 
        console.error("Error loading dev mode state:", error);
        gameState.developerMode = false;
    }
}

// --- Event Listener Setup ---
// This function should be called once when the application starts.
export function setupEventListeners() {
    // UI Navigation Buttons
    if (UI.startBtn) UI.startBtn.addEventListener('click', () => {
        let levelToStart = 1;
        if (gameState.developerMode && UI.levelSelectInput) {
            const selectedLevel = parseInt(UI.levelSelectInput.value, 10);
            if (!isNaN(selectedLevel) && selectedLevel >= 1 && selectedLevel <= settings.totalLevelsCount) {
                levelToStart = selectedLevel;
            } else {
                alert(`Please enter a valid level number between 1 and ${settings.totalLevelsCount}.`);
                return; 
            }
        }
        startGameAtLevel(levelToStart);
    });
    if (UI.highScoreBtn) UI.highScoreBtn.addEventListener('click', () => {
        const scores = loadHighScores();
        UI.updateHighScoresListUI(scores);
        UI.showScreen(UI.highScoresScreen);
    });
     if (UI.settingsBtn) UI.settingsBtn.addEventListener('click', () => {
        UI.updateDeveloperModeUIState(gameState.developerMode); // Ensure checkbox reflects current state
        UI.showScreen(UI.settingsScreen);
    });
    if (UI.infoBtn) UI.infoBtn.addEventListener('click', () => {
        UI.populatePowerupInfoUI();
        UI.hidePowerupDescription();
        UI.showScreen(UI.infoScreen);
    });
    if (UI.backToMenuBtn) UI.backToMenuBtn.addEventListener('click', () => UI.showScreen(UI.startScreen));
    if (UI.backToSettingsMenuBtn) UI.backToSettingsMenuBtn.addEventListener('click', () => UI.showScreen(UI.startScreen));
    if (UI.backToInfoMenuBtn) UI.backToInfoMenuBtn.addEventListener('click', () => UI.showScreen(UI.startScreen));
    if (UI.tryAgainBtn) UI.tryAgainBtn.addEventListener('click', () => startGameAtLevel(1));
    if (UI.mainMenuGameOverBtn) UI.mainMenuGameOverBtn.addEventListener('click', () => UI.showScreen(UI.startScreen));
    if (UI.menuBtn) UI.menuBtn.addEventListener('click', () => {
        pauseGame(); // Ensure game is paused before showing menu
        clearAllTimedPowerupEffects(gameState); // Clear effects when going to menu
        gameState.gameRunning = false; // Explicitly stop game running flag
        UI.showScreen(UI.startScreen);
    });
    if (UI.nextLevelBtn) UI.nextLevelBtn.addEventListener('click', startNextLevel);
    
    // Game Control Buttons
    if (UI.pauseBtn) UI.pauseBtn.addEventListener('click', pauseGame);
    if (UI.resumeBtn) UI.resumeBtn.addEventListener('click', resumeGame);
    if (UI.restartBtn) UI.restartBtn.addEventListener('click', restartLevel);

    // Canvas Input
    if (UI.canvas) {
        UI.canvas.addEventListener('click', handleCanvasClickOrTouch);
        UI.canvas.addEventListener('touchstart', handleCanvasClickOrTouch, { passive: false });
        UI.canvas.addEventListener('mousemove', handleCanvasMouseMove);
        UI.canvas.addEventListener('mousedown', handleCanvasClickOrTouch);
        UI.canvas.addEventListener('mouseup', handleCanvasMouseUpOrLeave);
        UI.canvas.addEventListener('mouseleave', handleCanvasMouseUpOrLeave);
        UI.canvas.addEventListener('touchmove', handleCanvasTouchMove, { passive: false });
    }

    // Settings
    if (UI.developerModeToggle) UI.developerModeToggle.addEventListener('change', (e) => {
        gameState.developerMode = e.target.checked;
        saveDeveloperMode();
        UI.updateDeveloperModeUIState(gameState.developerMode);
    });

    // Powerup Info Screen Interaction
    if (UI.powerupInfoList) UI.powerupInfoList.addEventListener('click', (e) => {
        const item = e.target.closest('.powerup-item');
        if (item && item.dataset.powerupType) {
            UI.showPowerupDescription(item.dataset.powerupType);
        }
    });
    if (UI.infoScreen) UI.infoScreen.addEventListener('click', (e) => {
        if (UI.powerupDescriptionWindow && UI.powerupDescriptionWindow.style.display === 'block' && !UI.powerupDescriptionWindow.contains(e.target)) {
            UI.hidePowerupDescription();
        }
    });
    if (UI.powerupDescriptionWindow) UI.powerupDescriptionWindow.addEventListener('click', e => e.stopPropagation());

    // Window Resize
    window.addEventListener('resize', handleResize);
}

// --- Initial Game Setup ---
export function initializeGame() {
    console.log("Initializing Game...");
    loadDeveloperMode();
    initCanvasAndPaddle();
    UI.initialUISetup(); // Set initial screen visibility
    UI.updateDeveloperModeUIState(gameState.developerMode); // Update UI based on loaded state
    setupEventListeners();
    console.log("Game Initialized and Event Listeners Setup.");
} 