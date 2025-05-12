// Main entry point for the game
import { initializeGame } from './js/game.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Initializing game from script.js...");
    initializeGame();
});
