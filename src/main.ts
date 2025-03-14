import { Game } from './game';
import { setupUI } from './ui';

// Initialize the UI
setupUI();

// Initialize the game
const game = new Game();

// Start the game
game.start();