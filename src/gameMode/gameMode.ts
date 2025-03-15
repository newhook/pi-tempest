/**
 * Interface for game modes
 * All game modes must implement these methods
 */
export interface GameMode {
  /**
   * Called when entering this game mode
   */
  enter(): void;
  
  /**
   * Called every frame to update the game state
   * @param delta Time elapsed since last update
   */
  update(delta: number): void;
  
  /**
   * Called when exiting this game mode
   */
  exit(): void;
}