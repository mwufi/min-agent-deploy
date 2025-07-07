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
      if (isProcessing) return;
      
      const command = behavior.handleKeydown(e);
      if (!command) return;

      console.log('[Genesis AI] Slash command detected:', command);
      isProcessing = true;

      try {
        // Get selection context before removing the command
        const context = behavior.getSelectionContext();
        
        // Remove the slash command from the document
        setTimeout(() => behavior.removeSlashCommand(), 0);
        
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
          
          // Listen for streaming chunks
          const port = browser.runtime.connect({ name: 'ai-stream' });
          
          port.onMessage.addListener((msg) => {
            if (msg.type === 'CHUNK') {
              behavior.replaceAtSentinel(msg.text);
            } else if (msg.type === 'DONE') {
              behavior.removeSentinel();
              port.disconnect();
              isProcessing = false;
            } else if (msg.type === 'ERROR') {
              behavior.removeSentinel();
              behavior.insertTextAtCursor(`[Error: ${msg.error}]`);
              port.disconnect();
              isProcessing = false;
            }
          });
        }
      } catch (error) {
        console.error('[Genesis AI] Error processing command:', error);
        isProcessing = false;
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