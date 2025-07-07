export interface SiteBehavior {
  detectSlashCommand(buffer: string): string | null;
  getSelectionContext(): { text: string; position: Range | null };
  insertTextAtCursor(text: string): void;
  removeSlashCommand(): void;
}

export abstract class BaseSiteBehavior implements SiteBehavior {
  protected buffer = '';
  protected sentinel = '';

  abstract detectSlashCommand(buffer: string): string | null;
  abstract getSelectionContext(): { text: string; position: Range | null };
  abstract insertTextAtCursor(text: string): void;
  abstract removeSlashCommand(): void;

  handleKeydown(e: KeyboardEvent): string | null {
    // Skip if meta keys are pressed (except shift for capitals)
    if (e.ctrlKey || e.metaKey || e.altKey) return null;
    
    if (e.key.length === 1 && !e.isComposing) {
      this.buffer += e.key;
    } else if (e.key === 'Backspace') {
      this.buffer = this.buffer.slice(0, -1);
    } else if (e.key === 'Enter') {
      const command = this.detectSlashCommand(this.buffer);
      if (command) {
        // Prevent default Enter behavior when we have a command
        e.preventDefault();
        e.stopPropagation();
        this.buffer = '';
        return command;
      }
      this.buffer = '';
    } else if (e.key === 'Escape' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Clear buffer on navigation
      this.buffer = '';
    }
    
    // Clear buffer if it gets too long or has been idle
    if (this.buffer.length > 100) {
      this.buffer = this.buffer.slice(-50);
    }
    
    return null;
  }

  createSentinel(): string {
    this.sentinel = `«§${crypto.randomUUID().slice(0, 8)}§»`;
    return this.sentinel;
  }
}