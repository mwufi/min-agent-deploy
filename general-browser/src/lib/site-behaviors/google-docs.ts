import { BaseSiteBehavior } from './base';

export class GoogleDocsBehavior extends BaseSiteBehavior {
  private lastCommandLength = 0;

  detectSlashCommand(buffer: string): string | null {
    const match = buffer.match(/\/ai\s+(.+)$/i);
    if (match) {
      this.lastCommandLength = match[0].length;
      return match[1].trim();
    }
    return null;
  }

  getSelectionContext(): { text: string; position: Range | null } {
    const selection = window.getSelection();
    const text = selection?.toString() || '';
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    
    return { text, position: range };
  }

  removeSlashCommand(): void {
    // More robust approach: simulate backspaces to remove the command
    if (this.lastCommandLength > 0) {
      // First, make sure we're at the end of the command
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        selection.collapseToEnd();
      }
      
      // Simulate backspace keystrokes to delete the command
      for (let i = 0; i < this.lastCommandLength; i++) {
        document.execCommand('delete', false);
      }
      
      this.lastCommandLength = 0;
      return;
    }

    // Fallback: try to find and remove command in current paragraph
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    // Google Docs wraps text in complex spans, so we need to look at the parent
    const range = selection.getRangeAt(0);
    let container = range.commonAncestorContainer;
    
    // Find the paragraph-level element
    while (container && container.nodeType !== Node.ELEMENT_NODE) {
      container = container.parentNode;
    }
    
    if (!container) return;
    
    // Get all text content in this paragraph
    const textContent = (container as Element).textContent || '';
    const match = textContent.match(/\/ai\s+[^\n]*/i);
    
    if (match) {
      // Find all text nodes in this container
      const walker = document.createTreeWalker(
        container as Node,
        NodeFilter.SHOW_TEXT,
        null,
        false
      );
      
      let currentOffset = 0;
      let startNode: Node | null = null;
      let startOffset = 0;
      let endNode: Node | null = null;
      let endOffset = 0;
      
      const commandStart = textContent.indexOf(match[0]);
      const commandEnd = commandStart + match[0].length;
      
      let node;
      while (node = walker.nextNode()) {
        const nodeLength = node.textContent?.length || 0;
        
        if (!startNode && currentOffset + nodeLength > commandStart) {
          startNode = node;
          startOffset = commandStart - currentOffset;
        }
        
        if (!endNode && currentOffset + nodeLength >= commandEnd) {
          endNode = node;
          endOffset = commandEnd - currentOffset;
          break;
        }
        
        currentOffset += nodeLength;
      }
      
      if (startNode && endNode) {
        const deleteRange = document.createRange();
        deleteRange.setStart(startNode, startOffset);
        deleteRange.setEnd(endNode, endOffset);
        
        selection.removeAllRanges();
        selection.addRange(deleteRange);
        document.execCommand('delete', false);
      }
    }
  }

  insertTextAtCursor(text: string): void {
    // Use execCommand for Google Docs compatibility
    document.execCommand('insertText', false, text);
  }

  // Helper to insert text with a sentinel for streaming
  insertWithSentinel(text: string): void {
    const sentinel = this.createSentinel();
    this.insertTextAtCursor(text + sentinel);
    return sentinel;
  }

  // Replace sentinel with new text (for streaming)
  replaceAtSentinel(newText: string): void {
    if (!this.sentinel) return;
    
    // Find and replace the sentinel
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const textNode = node as Text;
      const sentinelIndex = textNode.textContent?.indexOf(this.sentinel) ?? -1;
      
      if (sentinelIndex !== -1) {
        // Found it! Create a range at the sentinel
        const range = document.createRange();
        range.setStart(textNode, sentinelIndex);
        range.setEnd(textNode, sentinelIndex + this.sentinel.length);
        
        // Select and replace
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        document.execCommand('insertText', false, newText + this.sentinel);
        break;
      }
    }
  }

  removeSentinel(): void {
    if (!this.sentinel) return;
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    let node;
    while (node = walker.nextNode()) {
      const textNode = node as Text;
      const sentinelIndex = textNode.textContent?.indexOf(this.sentinel) ?? -1;
      
      if (sentinelIndex !== -1) {
        const range = document.createRange();
        range.setStart(textNode, sentinelIndex);
        range.setEnd(textNode, sentinelIndex + this.sentinel.length);
        
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        
        document.execCommand('delete', false);
        this.sentinel = '';
        break;
      }
    }
  }
}