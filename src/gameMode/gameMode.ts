import { SceneSetup } from "../scene";

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

  /**
   * Handle keyboard input events
   * @param event The keyboard event to handle
   */
  handleKeyDown(event: KeyboardEvent): void;

  /**
   * Handle keyboard key up events
   * @param event The keyboard event to handle
   */
  handleKeyUp(event: KeyboardEvent): void;

  /**
   * Handle mouse movement events
   * @param event The mouse event to handle
   */
  handleMouseMove(event: MouseEvent): void;

  /**
   * Handle mouse click events
   * @param event The mouse event to handle
   */
  handleClick(event: MouseEvent): void;

  /**
   * Handle touch movement events
   * @param event The touch event to handle
   */
  handleTouchMove(event: TouchEvent): void;

  /**
   * Handle touch start events
   * @param event The touch event to handle
   */
  handleTouchStart(event: TouchEvent): void;
}
