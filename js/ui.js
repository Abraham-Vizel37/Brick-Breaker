import { gameState, updateColorPalette, updateBaseBallSpeed } from './game.js'; // Assuming gameState will be managed in game.js
import { settings, powerupTypes, colorPalettes } from './constants.js'; // For populatePowerupInfo and dev mode UI

// --- DOM Element References ---
export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas ? canvas.getContext('2d') : null;

export const startScreen = document.getElementById('startScreen');
export const gameOverScreen = document.getElementById('gameOverScreen');
export const winScreen = document.getElementById('winScreen');
export const pauseScreen = document.getElementById('pauseScreen');
export const upgradeScreen = document.getElementById('upgradeScreen');
export const highScoresScreen = document.getElementById('highScores');
export const settingsScreen = document.getElementById('settingsScreen');
export const infoScreen = document.getElementById('infoScreen');

export const finalScoreDisplay = document.getElementById('finalScore');
export const scoreDisplay = document.getElementById('scoreDisplay');
export const livesDisplay = document.getElementById('livesDisplay');
export const levelDisplay = document.getElementById('levelDisplay');
export const aestheticDisplay = document.getElementById('aestheticDisplay');
export const pauseBtn = document.getElementById('pauseBtn');
export const highScoresList = document.getElementById('highScoresList');
// export const bossHPBar = document.getElementById('bossHPBar'); // Not used elsewhere
// export const bossHPBarFill = document.getElementById('bossHPBarFill'); // Not used elsewhere
export const levelCompleteMessage = document.getElementById('levelCompleteMessage');
// export const laserBeamsContainer = document.getElementById('laserBeams'); // Visual container, not directly manipulated by JS logic for now

export const developerModeToggle = document.getElementById('developerModeToggle');
export const developerModeText = document.getElementById('developerModeText');
export const levelSelectInput = document.getElementById('levelSelectInput');
export const levelSelectContainer = document.getElementById('levelSelectContainer');
export const levelSelectLabel = document.querySelector('#levelSelectContainer label');
export const powerupInfoList = document.getElementById('powerupInfoList');
export const powerupDescriptionWindow = document.getElementById('powerupDescriptionWindow');

// Add reference to color palette select dropdown
export const colorPaletteSelect = document.getElementById('colorPaletteSelect');

// Add reference to baseBallSpeed input
export const baseBallSpeedInput = document.getElementById('baseBallSpeedInput');

// UI Buttons (grouped for clarity)
export const startBtn = document.getElementById('startBtn');
export const highScoreBtn = document.getElementById('highScoreBtn');
export const settingsBtn = document.getElementById('settingsBtn');
export const infoBtn = document.getElementById('infoBtn');
export const backToMenuBtn = document.getElementById('backToMenuBtn'); // From High Scores
export const backToSettingsMenuBtn = document.getElementById('backToSettingsMenuBtn'); // From Settings
export const backToInfoMenuBtn = document.getElementById('backToInfoMenuBtn'); // From Info
export const tryAgainBtn = document.getElementById('tryAgainBtn');
export const mainMenuGameOverBtn = document.getElementById('mainMenuGameOverBtn');
export const menuBtn = document.getElementById('menuBtn'); // From Pause screen
export const nextLevelBtn = document.getElementById('nextLevelBtn');
export const resumeBtn = document.getElementById('resumeBtn');
export const restartBtn = document.getElementById('restartBtn'); // From Pause screen

const allScreens = [
    startScreen, gameOverScreen, winScreen, pauseScreen, highScoresScreen, settingsScreen, infoScreen, upgradeScreen
];

// --- Screen Management ---
export function showScreen(screenToShow) {
    allScreens.forEach(screen => {
        if (screen) {
            screen.style.display = (screen === screenToShow) ? 'flex' : 'none';
        }
    });
    if (bossHPBar && screenToShow !== gameOverScreen && screenToShow !== winScreen && screenToShow !== pauseScreen) { // Example condition for boss bar
         // bossHPBar.style.display = 'none'; // Keep boss bar hidden unless in active game
    }
}

// --- HUD Updates ---
export function updateHUD() {
    if(scoreDisplay) scoreDisplay.textContent = `Score: ${gameState.score}`;
    if(livesDisplay) livesDisplay.textContent = `Lives: ${gameState.lives}`;
    if(levelDisplay) levelDisplay.textContent = `Level: ${gameState.level}`;
    // if(aestheticDisplay) aestheticDisplay.textContent = gameState.currentLevelConcept; // Removed display of level concept
}

export function updateBossHPBar() {
    // Not used in this game structure, but kept for completeness if added later
    if(bossHPBar) bossHPBar.style.display = 'none';
}

export function updateFinalScore() {
    if(finalScoreDisplay) finalScoreDisplay.textContent = `Final Score: ${gameState.score}`;
}

export function updateLevelCompleteMessage() {
    if (!levelCompleteMessage) return;
    if (gameState.level >= settings.totalLevelsCount) { // Updated setting name
        levelCompleteMessage.textContent = `You cleared all ${settings.totalLevelsCount} levels! Incredible!`; // Updated setting name
    } else {
        levelCompleteMessage.textContent = `Level ${gameState.level} Clear!`;
    }
}


// --- High Score List Update ---
export function updateHighScoresListUI(scores) { // Expects scores array from game logic
    if (!highScoresList) {
        console.error("High scores list element (#highScoresList) not found!");
        return;
    }
    highScoresList.innerHTML = ''; 
    if (scores.length === 0) {
        const li = document.createElement('li');
        li.textContent = 'No high scores yet!';
        highScoresList.appendChild(li);
    } else {
        scores.forEach((entry, index) => {
            const li = document.createElement('li');
            if (entry && typeof entry.score === 'number' && typeof entry.date === 'string' && typeof entry.name === 'string') {
                li.innerHTML = `<span>#${index + 1}: ${entry.name}</span> <span>${entry.score}</span> <span>${entry.date}</span>`;
            } else {
                console.warn("Malformed high score entry found:", entry);
                li.innerHTML = `<span>#${index + 1}: ???</span> <span>Data Error</span> <span>--/--/----</span>`;
            }
            highScoresList.appendChild(li);
        });
    }
}

// --- Developer Mode UI ---
export function updateDeveloperModeUIState(isDevMode) {
    if(developerModeText) developerModeText.style.display = isDevMode ? 'block' : 'none';
    if(levelSelectContainer) levelSelectContainer.style.display = isDevMode ? 'flex' : 'none';
    if(levelSelectLabel) levelSelectLabel.style.display = isDevMode ? 'inline-block' : 'none';
    if(levelSelectInput) {
        levelSelectInput.style.display = isDevMode ? 'inline-block' : 'none';
        levelSelectInput.max = settings.totalLevelsCount; // Updated setting name
    }
    if(developerModeToggle) developerModeToggle.checked = isDevMode;
}

// --- Powerup Info Screen ---
export function populatePowerupInfoUI() {
    if (!powerupInfoList || !powerupDescriptionWindow || !ctx) {
        console.error("Powerup info elements or canvas context not found!");
        return;
    }
    powerupInfoList.innerHTML = ''; 

    powerupTypes.forEach(p => {
        const infoItem = document.createElement('div');
        infoItem.classList.add('powerup-item');
        infoItem.dataset.powerupType = p.type;

        // Create a small canvas to draw the powerup shape
        const powerupCanvas = document.createElement('canvas');
        const canvasSize = 40; // Size of the mini canvas
        powerupCanvas.width = canvasSize;
        powerupCanvas.height = canvasSize;
        const powerupCtx = powerupCanvas.getContext('2d');

        // Draw the powerup shape (capsule) on the mini canvas
        if (powerupCtx) {
            // Use dimensions similar to the in-game powerups (adjust as needed for mini canvas scale)
            const powerupWidth = 20 * (canvasSize / 40); // Scale based on canvas size
            const powerupHeight = 11 * (canvasSize / 40); // Scale based on canvas size
            const powerupX = (canvasSize - powerupWidth) / 2;
            const powerupY = (canvasSize - powerupHeight) / 2;

            powerupCtx.fillStyle = p.color;
            powerupCtx.shadowColor = 'rgba(0,0,0,0.5)';
            powerupCtx.shadowBlur = 3;
            powerupCtx.shadowOffsetX = 2;
            powerupCtx.shadowOffsetY = 2;

            // Draw rectangle shape
            powerupCtx.fillRect(powerupX, powerupY, powerupWidth, powerupHeight);

            // Draw stroke
            powerupCtx.strokeStyle = '#000';
            powerupCtx.lineWidth = 0.5 * (canvasSize / 40); // Scale stroke width
            powerupCtx.strokeRect(powerupX, powerupY, powerupWidth, powerupHeight);

            // Draw the powerup symbol on top
            powerupCtx.fillStyle = 'white'; // Symbol color
            // Use font size and stroke similar to in-game powerups
            const symbolFontSize = 11 * (canvasSize / 40); // Scale font size
            powerupCtx.font = `bold ${symbolFontSize}px Arial`;
            powerupCtx.textAlign = 'center';
            powerupCtx.textBaseline = 'middle';
            // Clear shadows for text
            powerupCtx.shadowColor = 'transparent';
            const symbolTextY = canvasSize / 2 + (symbolFontSize * 0.1); // Adjust for vertical alignment

            // Draw text stroke
            powerupCtx.strokeStyle = '#000000';
            powerupCtx.lineWidth = 2 * (canvasSize / 40); // Scale stroke width
            powerupCtx.strokeText(p.symbol, canvasSize / 2, symbolTextY);
            // Draw text fill
            powerupCtx.fillText(p.symbol, canvasSize / 2, symbolTextY);
        }

        const nameElement = document.createElement('span');
        nameElement.textContent = p.name;

        infoItem.appendChild(powerupCanvas);
        infoItem.appendChild(nameElement);
        powerupInfoList.appendChild(infoItem);

        // Add click listener to show description
        infoItem.addEventListener('click', () => {
            showPowerupDescription(p.type);
        });
    });

    // Add event listener for the close button
    const closeButton = powerupDescriptionWindow.querySelector('#closePowerupDescription');
    if (closeButton) {
        closeButton.addEventListener('click', hidePowerupDescription);
    }
}

export function showPowerupDescription(powerupType) {
    const powerupDef = powerupTypes.find(p => p.type === powerupType);
    if (powerupDef && powerupDescriptionWindow) {
        const descriptionHeader = powerupDescriptionWindow.querySelector('h4');
        const descriptionParagraph = powerupDescriptionWindow.querySelector('p');
        if (descriptionHeader && descriptionParagraph) {
            descriptionHeader.textContent = powerupDef.name;
            let descriptionText = '';
            switch(powerupDef.type) {
                case 'slowBall': descriptionText = 'Slows down balls for a limited time.'; break;
                case 'fastBall': descriptionText = 'Speeds up balls for a limited time.'; break;
                case 'multiBall': descriptionText = 'Splits your current balls into multiple balls.'; break;
                case 'widerPaddle': descriptionText = 'Makes your paddle wider permanently for the current life.'; break;
                case 'laser': descriptionText = 'Gives your paddle the ability to shoot lasers for a limited time. Tap/click to shoot.'; break;
                case 'catch': descriptionText = 'Allows your paddle to catch the ball on collision for a limited time. Tap/click to release.'; break;
                case 'break': descriptionText = 'Balls become powerful and break bricks instantly, phasing through them, for a limited time.'; break;
                case 'extraLife': descriptionText = 'Instantly gain an extra life.'; break;
                default: descriptionText = 'Effect unknown.'; break;
            }
            descriptionParagraph.textContent = descriptionText;
            powerupDescriptionWindow.style.display = 'block';
        } else {
            console.error("Description window inner elements not found!");
        }
    } else {
        console.error("Powerup definition or description window not found for type:", powerupType);
    }
}

export function hidePowerupDescription() {
    if (powerupDescriptionWindow) {
        powerupDescriptionWindow.style.display = 'none';
    }
}

// Initial UI setup calls (e.g. hiding all screens except start)
// This should be called from game.js or main script.js after DOM is loaded.
export function initialUISetup() {
    showScreen(startScreen); 
    updateBossHPBar(); // Ensure it's hidden initially
    if (levelSelectInput) levelSelectInput.value = 1; // Default level select
    populateColorPaletteSelect(); // Populate the dropdown on initial setup
    populateSettingsInputs(); // Populate settings inputs with current values
    setupSettingsListeners(); // Setup listeners for settings inputs
}

// Function to populate settings inputs with current values
export function populateSettingsInputs() {
    if (baseBallSpeedInput) {
        baseBallSpeedInput.value = settings.baseBallSpeed;
    }
    // Add other settings inputs here if needed later
}

// Function to set up event listeners for settings inputs
export function setupSettingsListeners() {
    if (baseBallSpeedInput) {
        baseBallSpeedInput.addEventListener('change', (event) => {
            const speed = parseFloat(event.target.value);
            // Call game logic function to update speed and handle validation
            // Assuming a function like updateBaseBallSpeed(speed) exists in game.js
            console.log("Base Ball Speed changed to:", speed);
            // Placeholder for calling game logic:
            updateBaseBallSpeed(speed);
        });
    }
    // Add other settings listeners here if needed later
}

// Function to populate the color palette select dropdown
export function populateColorPaletteSelect() {
    if (!colorPaletteSelect) {
        console.error("Color palette select element (#colorPaletteSelect) not found!");
        return;
    }
    colorPaletteSelect.innerHTML = ''; // Clear existing options

    colorPalettes.forEach((palette, index) => {
        const option = document.createElement('option');
        option.value = index; // Use index as the value
        option.textContent = palette.name;
        colorPaletteSelect.appendChild(option);
    });

    // Set the initial selection to the current palette in gameState
    colorPaletteSelect.value = gameState.currentColorPaletteIndex;

    // Add event listener to handle palette changes
    colorPaletteSelect.addEventListener('change', (event) => {
        const selectedIndex = parseInt(event.target.value, 10);
        // Call a function in game.js to update the color palette
        // Assuming a function like updateColorPalette(selectedIndex) exists in game.js
        // We'll need to add this function in game.js next.
        // For now, we'll just log the change.
        console.log("Color palette changed to index:", selectedIndex);
        // Placeholder for calling game logic:
        updateColorPalette(selectedIndex);
    });
} 