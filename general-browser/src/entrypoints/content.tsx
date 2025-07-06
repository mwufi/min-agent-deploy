import { createRoot } from 'react-dom/client';
import { BottomBar } from '@/components/BottomBar';
import { GmailContext } from '@/lib/GmailContext';
import { createObservationBus, createActionBus } from '@/lib/EventBus';
import React from 'react';
import '@/styles/global.css';

// @ts-ignore - gmail-js doesn't have proper types
import GmailFactory from 'gmail-js';

export default defineContentScript({
  matches: ['https://mail.google.com/*'],
  cssInjectionMode: 'ui',
  
  async main(ctx) {
    console.log('[Extension] Content script loaded with context:', ctx);
    // Only run on Gmail pages
    if (!window.location.hostname.includes('mail.google.com')) {
      return;
    }

    console.log('[Extension] Initializing on Gmail...');

    // Wait for Gmail to load
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds total
    
    const checkGmailLoaded = setInterval(() => {
      attempts++;
      
      // Check multiple jQuery locations
      const jq = window.jQuery || window.$ || (window as any).jQuery || (window as any).$;
      
      console.log(`[Extension] Checking for jQuery... (attempt ${attempts}/${maxAttempts})`, {
        hasJQuery: !!jq,
        windowJQuery: !!window.jQuery,
        window$: !!window.$,
        location: window.location.href
      });
      
      if (jq) {
        clearInterval(checkGmailLoaded);
        console.log('[Extension] jQuery detected, initializing...');
        // Pass jQuery explicitly
        initializeExtension(ctx, jq);
      } else if (attempts >= maxAttempts) {
        clearInterval(checkGmailLoaded);
        console.error('[Extension] Failed to detect jQuery after 10 seconds');
        // Try to initialize without Gmail.js
        initializeExtensionFallback(ctx);
      }
    }, 100);
  },
});

function initializeExtension(ctx: any, jq: any) {
  console.log('[Extension] Starting initialization with jQuery...');
  
  try {
    // Initialize Gmail.js with the passed jQuery instance
    const gmail = new GmailFactory.Gmail(jq);
  
  // Initialize our systems
  const observationBus = createObservationBus();
  const gmailContext = new GmailContext(gmail);
  
  // Create container for our UI
  console.log('[Extension] Creating UI container...');
  const container = document.createElement('div');
  container.id = 'genesis-ai-extension';
  // Add temporary debug styling
  container.style.cssText = 'position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; background: red; height: 2px;';
  document.body.appendChild(container);
  console.log('[Extension] Container added to DOM');
  
  // Remove debug styling after 1 second
  setTimeout(() => {
    container.style.cssText = '';
  }, 1000);

  // Function to show the bottom bar
  const showBottomBar = () => {
    console.log('[Extension] showBottomBar called');
    const root = createRoot(container);
    
    const handleClose = () => {
      root.unmount();
      chrome.storage.local.set({ bottomBarHidden: true });
    };

    root.render(
      <React.StrictMode>
        <BottomBar onClose={handleClose} />
      </React.StrictMode>
    );

    chrome.storage.local.set({ bottomBarHidden: false });
    console.log('[Extension] Bottom bar should be visible now');
  };

  // Check if bottom bar should be shown
  chrome.storage.local.get(['bottomBarHidden'], (result) => {
    console.log('[Extension] Storage result:', result);
    if (!result.bottomBarHidden) {
      console.log('[Extension] Bottom bar not hidden, showing...');
      showBottomBar();
    } else {
      console.log('[Extension] Bottom bar is hidden');
    }
  });

  // Listen for extension icon clicks
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleBottomBar') {
      chrome.storage.local.get(['bottomBarHidden'], (result) => {
        if (result.bottomBarHidden) {
          showBottomBar();
        }
      });
    }
  });

  // Track Gmail events
  gmail.observe.on('load', () => {
    observationBus.info('gmail_loaded', {
      userEmail: gmail.get.user_email(),
      currentView: gmail.get.current_page()
    });
  });

  // Track all Gmail context changes
  setInterval(() => {
    const context = gmailContext.getContext();
    if (context.recentActions.length > 0 || context.currentEmail) {
      observationBus.info('gmail_context_update', context);
    }
  }, 5000);

  console.log('[Extension] Initialized successfully');
  } catch (error) {
    console.error('[Extension] Error during initialization:', error);
    // Try fallback initialization
    initializeExtensionFallback(ctx);
  }
}

// Fallback initialization without Gmail.js
function initializeExtensionFallback(ctx: any) {
  console.log('[Extension] Using fallback initialization (no Gmail.js)...');
  
  try {
    // Create container for our UI
    const container = document.createElement('div');
    container.id = 'genesis-ai-extension';
    document.body.appendChild(container);

    // Function to show the bottom bar
    const showBottomBar = () => {
      console.log('[Extension] Attempting to show bottom bar...');
      const root = createRoot(container);
      
      const handleClose = () => {
        root.unmount();
        chrome.storage.local.set({ bottomBarHidden: true });
      };

      root.render(
        <React.StrictMode>
          <BottomBar onClose={handleClose} />
        </React.StrictMode>
      );

      chrome.storage.local.set({ bottomBarHidden: false });
      console.log('[Extension] Bottom bar rendered');
    };

    // Check if bottom bar should be shown
    chrome.storage.local.get(['bottomBarHidden'], (result) => {
      console.log('[Extension] Storage check:', { bottomBarHidden: result.bottomBarHidden });
      if (!result.bottomBarHidden) {
        showBottomBar();
      }
    });

    // Listen for extension icon clicks
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleBottomBar') {
        chrome.storage.local.get(['bottomBarHidden'], (result) => {
          if (result.bottomBarHidden) {
            showBottomBar();
          }
        });
      }
    });

    console.log('[Extension] Fallback initialization complete');
  } catch (error) {
    console.error('[Extension] Error during fallback initialization:', error);
  }
}
