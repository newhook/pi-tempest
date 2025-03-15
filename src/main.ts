import { Game } from './game';
import { setupUI } from './ui';

// Function to initialize the game
function initGame() {
  // Initialize the UI
  setupUI();

  // Initialize the game
  const game = new Game();

  // Start the game loop
  game.start();
}

// Start the game when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initGame);