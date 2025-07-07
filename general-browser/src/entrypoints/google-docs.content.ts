import { createSiteBehavior } from '@/lib/site-behaviors';

export default defineContentScript({
  matches: ['https://docs.google.com/document/*'],
  allFrames: true,
  runAt: 'document_end',
  
  async main() {
    console.log('[Genesis AI] Google Docs content script loaded in frame:', window.location.href);
    
    // Only run in the main editing iframe
    if (!window.location.pathname.includes('/document/d/')) {
      console.log('[Genesis AI] Not in main document frame, skipping');
      return;
    }
    
    const behavior = createSiteBehavior('docs.google.com');
    if (!behavior) {
      console.error('[Genesis AI] No behavior found for Google Docs');
      return;
    }

    let isProcessing = false;
    const commandQueue: Array<{ command: string; context: any }> = [];
    let currentPort: chrome.runtime.Port | null = null;

    // Process commands from queue
    async function processNextCommand() {
      if (commandQueue.length === 0) {
        isProcessing = false;
        return;
      }

      const { command, context } = commandQueue.shift()!;
      
      // Remove the queue placeholder if it exists
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.commonAncestorContainer.parentElement;
        if (container && container.textContent?.includes(`[Queued: ${command}]`)) {
          // Find and remove the placeholder
          const text = container.textContent;
          const placeholderText = `\n[Queued: ${command}]\n`;
          if (text.includes(placeholderText)) {
            container.textContent = text.replace(placeholderText, '');
          }
        }
      }
      
      try {
        // Send to background script
        const response = await browser.runtime.sendMessage({
          type: 'SLASH_COMMAND',
          command,
          context: {
            selectedText: context.text,
            hasSelection: !!context.text
          }
        });

        if (response.type === 'STREAM_START') {
          // Insert sentinel for streaming
          const sentinel = behavior.createSentinel();
          behavior.insertTextAtCursor(sentinel);
          
          // Create new port for this command
          currentPort = browser.runtime.connect({ name: 'ai-stream' });
          
          currentPort.onMessage.addListener((msg) => {
            if (msg.type === 'CHUNK') {
              behavior.replaceAtSentinel(msg.text);
            } else if (msg.type === 'DONE') {
              behavior.removeSentinel();
              currentPort?.disconnect();
              currentPort = null;
              // Process next command in queue
              setTimeout(processNextCommand, 100);
            } else if (msg.type === 'ERROR') {
              behavior.removeSentinel();
              behavior.insertTextAtCursor(`[Error: ${msg.error}]`);
              currentPort?.disconnect();
              currentPort = null;
              // Process next command despite error
              setTimeout(processNextCommand, 100);
            }
          });
        } else {
          // No streaming, process next command
          setTimeout(processNextCommand, 100);
        }
      } catch (error) {
        console.error('[Genesis AI] Error processing command:', error);
        // Process next command despite error
        setTimeout(processNextCommand, 100);
      }
    }

    // Try multiple event listeners to catch Google Docs events
    const setupEventListeners = () => {
      // Try on document
      document.addEventListener('keydown', handleKeyEvent, true);
      
      // Try on body
      if (document.body) {
        document.body.addEventListener('keydown', handleKeyEvent, true);
      }
      
      // Try on the Google Docs canvas iframe if it exists
      setTimeout(() => {
        // Google Docs uses a canvas-based editor, look for the editing surface
        const canvasFrame = document.querySelector('iframe.docs-texteventtarget-iframe');
        if (canvasFrame && canvasFrame.contentDocument) {
          console.log('[Genesis AI] Found Google Docs canvas frame');
          canvasFrame.contentDocument.addEventListener('keydown', handleKeyEvent, true);
        }
        
        // Also try the contenteditable divs
        const editableDivs = document.querySelectorAll('[contenteditable="true"]');
        editableDivs.forEach(div => {
          div.addEventListener('keydown', handleKeyEvent, true);
        });
        
        // Try input and beforeinput events as fallback
        document.addEventListener('input', handleInputEvent, true);
        document.addEventListener('beforeinput', handleBeforeInputEvent, true);
      }, 1000);
    };

    async function handleKeyEvent(e: KeyboardEvent) {
      const command = behavior.handleKeydown(e);
      if (!command) return;

      console.log('[Genesis AI] Slash command detected:', command);
      
      // Get selection context before removing the command
      const context = behavior.getSelectionContext();
      
      // Remove the slash command from the document
      setTimeout(() => behavior.removeSlashCommand(), 0);
      
      // Add to queue
      commandQueue.push({ command, context });
      
      // Insert a placeholder to show command is queued
      if (isProcessing) {
        behavior.insertTextAtCursor(`\n[Queued: ${command}]\n`);
      }
      
      // Start processing if not already processing
      if (!isProcessing) {
        isProcessing = true;
        setTimeout(processNextCommand, 100);
      }
    }

    function handleInputEvent(e: Event) {
      // Input event fallback - currently just for debugging
    }

    function handleBeforeInputEvent(e: Event) {
      const inputEvent = e as InputEvent;
      if (inputEvent.data && inputEvent.inputType === 'insertText') {
        // Manually track characters for buffer as fallback
        behavior.handleKeydown(new KeyboardEvent('keydown', { key: inputEvent.data }));
      }
    }

    // Set up all event listeners
    setupEventListeners();
    
    // Also monitor for DOM changes in case Google Docs adds elements later
    const observer = new MutationObserver(() => {
      const editableDivs = document.querySelectorAll('[contenteditable="true"]:not([data-genesis-listener])');
      editableDivs.forEach(div => {
        div.setAttribute('data-genesis-listener', 'true');
        div.addEventListener('keydown', handleKeyEvent, true);
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }
});