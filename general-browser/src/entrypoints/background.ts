export default defineBackground(() => {
  console.log('GENESIS AI Extension initialized', { id: browser.runtime.id });

  // Handle extension icon clicks
  browser.action.onClicked.addListener(async (tab) => {
    if (tab.id && tab.url && tab.url.includes('mail.google.com')) {
      // Send message to content script to toggle bottom bar
      try {
        await browser.tabs.sendMessage(tab.id, { action: 'toggleBottomBar' });
      } catch (error) {
        console.error('Failed to send message to content script:', error);
        // Content script might not be loaded yet, try injecting it
        browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-scripts/content.js']
        });
      }
    }
  });

  // Handle slash commands from content scripts
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'SLASH_COMMAND') {
      console.log('[Background] Received slash command:', message.command);
      
      // Send immediate response to start streaming
      sendResponse({ type: 'STREAM_START' });
      
      // Handle streaming with the content script
      handleSlashCommand(message, sender.tab?.id);
      
      return true; // Keep message channel open
    }
  });

  // Handle streaming connections
  browser.runtime.onConnect.addListener((port) => {
    if (port.name === 'ai-stream') {
      console.log('[Background] Stream connection established');
      
      // Store port for streaming
      streamingPorts.set(port.sender?.tab?.id || 0, port);
      
      port.onDisconnect.addListener(() => {
        streamingPorts.delete(port.sender?.tab?.id || 0);
      });
    }
  });

  // Optional: Handle installation
  browser.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    // Clear any stored state
    browser.storage.local.clear();
  });
});

// Store active streaming connections
const streamingPorts = new Map<number, chrome.runtime.Port>();

// Mock streaming function - replace with actual AI API call
async function handleSlashCommand(message: any, tabId?: number) {
  if (!tabId) return;
  
  const port = streamingPorts.get(tabId);
  if (!port) {
    console.error('[Background] No streaming port found for tab:', tabId);
    return;
  }

  try {
    // Simulate AI streaming response
    const response = await simulateAIStream(message.command, message.context);
    
    // Stream each chunk
    for (const chunk of response) {
      port.postMessage({ type: 'CHUNK', text: chunk });
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate streaming delay
    }
    
    // Signal completion
    port.postMessage({ type: 'DONE' });
  } catch (error) {
    port.postMessage({ type: 'ERROR', error: String(error) });
  }
}

// Mock AI response - replace with actual API
async function simulateAIStream(command: string, context: any): Promise<string[]> {
  console.log('[Background] Processing command:', command, 'with context:', context);
  
  // Simulate different responses based on command
  const responses: Record<string, string> = {
    'summarize': 'This is a summary of the selected text. It captures the main points concisely.',
    'explain': 'This text means... Let me break it down for you step by step.',
    'rewrite': 'Here\'s a rewritten version with improved clarity and flow.',
    'default': `Processing command: "${command}". This is where the AI response would appear.`
  };
  
  const responseText = responses[command.toLowerCase()] || responses.default;
  
  // Split into chunks to simulate streaming
  const words = responseText.split(' ');
  const chunks: string[] = [];
  
  for (let i = 0; i < words.length; i++) {
    chunks.push(words[i] + (i < words.length - 1 ? ' ' : ''));
  }
  
  return chunks;
}
