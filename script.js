// Main entry point for the game
import { initializeGame } from './js/game.js';

// --- Sound Management ---
// Create an AudioContext
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Object to hold loaded sound buffers
const soundBuffers = {};

// Flag to control sound playback
let soundEnabled = true; // Default to sound on

// Function to load a sound file
async function loadSound(url, name) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        soundBuffers[name] = audioBuffer;
        console.log(`Sound loaded: ${name}`);
    } catch (error) {
        console.error(`Error loading sound ${url}:`, error);
    }
}

// Function to play a loaded sound
function playSound(name) {
    if (!soundEnabled || !soundBuffers[name]) {
        return; // Don't play if sound is disabled or buffer not loaded
    }

    const source = audioContext.createBufferSource();
    source.buffer = soundBuffers[name];
    source.connect(audioContext.destination);
    source.start(0);
}

// Load necessary sounds (replace with actual file paths)
// You'll need to provide or create these sound files (e.g., .wav or .mp3)
async function loadAllSounds() {
    // Example placeholder sound files
    await loadSound('sounds/brick_hit.wav', 'brickHit');
    await loadSound('sounds/paddle_bounce.wav', 'paddleBounce');
    await loadSound('sounds/wall_bounce.wav', 'wallBounce');
    await loadSound('sounds/game_over.wav', 'gameOver');
    await loadSound('sounds/level_complete.wav', 'levelComplete');
    await loadSound('sounds/powerup_catch.wav', 'powerupCatch');
    await loadSound('sounds/laser.wav', 'laserShoot');
    // Add more sounds as needed
}

// Expose playSound to other modules (like game.js, collision.js)
export { playSound };

document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM fully loaded. Initializing game from script.js...");

    // Load sounds before initializing the game or shortly after
    await loadAllSounds();

    initializeGame();

    // --- UI Event Listeners ---
    const soundToggle = document.getElementById('soundToggle');
    if (soundToggle) {
        // Initial state based on checkbox
        soundEnabled = soundToggle.checked;

        soundToggle.addEventListener('change', (event) => {
            soundEnabled = event.target.checked;
            console.log(`Sound ${soundEnabled ? 'enabled' : 'disabled'}`);
        });
    }
});
