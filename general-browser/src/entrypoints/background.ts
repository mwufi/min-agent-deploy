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

  // Optional: Handle installation
  browser.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    // Clear any stored state
    browser.storage.local.clear();
  });
});
