/**
 * KeyboardTrigger - A utility class for managing keyboard event listeners
 * and handling keyboard shortcuts in a centralized way.
 * 
 * This class provides a clean API for registering keyboard handlers
 * and automatically manages event listener lifecycle.
 */

type KeyHandler = (event: KeyboardEvent) => void;

interface KeyBinding {
  keys: string[];
  handler: KeyHandler;
  preventDefault?: boolean;
  description?: string;
}

export class KeyboardTrigger {
  private bindings: KeyBinding[] = [];
  private isActive: boolean = false;
  private boundHandler: ((event: KeyboardEvent) => void) | null = null;

  /**
   * Register a keyboard binding
   * @param keys - Array of key names (e.g., ['ArrowUp', 'w', 'W'])
   * @param handler - Function to call when any of the keys are pressed
   * @param options - Optional configuration
   */
  register(
    keys: string[],
    handler: KeyHandler,
    options: { preventDefault?: boolean; description?: string } = {}
  ): void {
    this.bindings.push({
      keys,
      handler,
      preventDefault: options.preventDefault ?? true,
      description: options.description,
    });
  }

  /**
   * Register multiple bindings at once
   * @param bindings - Array of key bindings
   */
  registerMultiple(bindings: Array<{
    keys: string[];
    handler: KeyHandler;
    preventDefault?: boolean;
    description?: string;
  }>): void {
    bindings.forEach(binding => this.register(
      binding.keys,
      binding.handler,
      { preventDefault: binding.preventDefault, description: binding.description }
    ));
  }

  /**
   * Start listening for keyboard events
   */
  start(): void {
    if (this.isActive) return;

    this.boundHandler = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundHandler);
    this.isActive = true;
  }

  /**
   * Stop listening for keyboard events
   */
  stop(): void {
    if (!this.isActive || !this.boundHandler) return;

    window.removeEventListener('keydown', this.boundHandler);
    this.boundHandler = null;
    this.isActive = false;
  }

  /**
   * Clear all registered bindings
   */
  clear(): void {
    this.bindings = [];
  }

  /**
   * Clear all bindings and stop listening
   */
  destroy(): void {
    this.stop();
    this.clear();
  }

  /**
   * Get all registered bindings (useful for debugging or showing help)
   */
  getBindings(): ReadonlyArray<Readonly<KeyBinding>> {
    return this.bindings;
  }

  /**
   * Internal handler for keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    for (const binding of this.bindings) {
      if (binding.keys.includes(event.key)) {
        if (binding.preventDefault) {
          event.preventDefault();
        }
        binding.handler(event);
        break; // Only trigger the first matching binding
      }
    }
  }
}

