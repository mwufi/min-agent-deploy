import './style.css';
import ReactDOM from 'react-dom/client';
import App from './App';
import { GmailContext } from '@/lib/GmailContext';
import { createObservationBus } from '@/lib/EventBus';

// @ts-ignore - gmail-js doesn't have proper types
import GmailFactory from 'gmail-js';
import $ from 'jquery';

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

    // Set up trusted types policy for jQuery if needed
    if ('trustedTypes' in window) {
      const trustedHTMLpolicy = (window as any).trustedTypes.createPolicy('default', {
        createHTML: (to_escape: string) => to_escape,
      });

      $.extend({
        htmlPrefilter: trustedHTMLpolicy.createHTML
      });
    }

    // Make jQuery available globally for gmail.js
    (window as any).jQuery = $;
    (window as any).$ = $;

    // Create UI with shadow DOM
    const ui = await createShadowRootUi(ctx, {
      name: 'genesis-ai-ui',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        // Create wrapper div to avoid React warning
        const app = document.createElement('div');
        container.append(app);

        // Create root and render App
        const root = ReactDOM.createRoot(app);
        root.render(<App />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    // Mount the UI
    ui.mount();

    // Initialize Gmail context
    initializeGmailContext($);
    
    // Make gmail accessible globally for other components
    // @ts-ignore
    window.gmail = new GmailFactory.Gmail($);
  },
});

function initializeGmailContext(jq: any) {
  console.log('[Extension] Initializing Gmail context...');
  
  try {
    // Initialize Gmail.js with the passed jQuery instance
    const gmail = new GmailFactory.Gmail(jq);
  
  // Initialize our systems
  const observationBus = createObservationBus();
  const gmailContext = new GmailContext(gmail);
  
  // Store instances globally
  // @ts-ignore
  window.gmailContext = gmailContext;

  // Track Gmail initialization and check API availability
  const hasNewApi = gmail.new && gmail.new.get && typeof gmail.new.get.thread_id === 'function';
  observationBus.info('gmail_loaded', {
    url: window.location.href,
    timestamp: Date.now(),
    hasNewApi,
    version: hasNewApi ? 'new' : 'legacy'
  });
  
  if (hasNewApi) {
    console.log('[Extension] Gmail new API is available - using DOM-based data extraction');
  } else {
    console.log('[Extension] Gmail new API not available - limited functionality');
  }

  // Track all Gmail context changes with throttling
  let lastContextUpdate = 0;
  setInterval(() => {
    const now = Date.now();
    const context = gmailContext.getContext();
    
    // Only send updates if there are actions and enough time has passed
    if (context.recentActions.length > 0 && now - lastContextUpdate > 10000) {
      observationBus.info('gmail_context_update', context);
      lastContextUpdate = now;
    }
  }, 5000);

  console.log('[Extension] Initialized successfully');
  } catch (error) {
    console.error('[Extension] Error during initialization:', error);
  }
}

