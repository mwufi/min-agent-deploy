import React, { useState, useEffect } from 'react';
import { BottomPanel } from './BottomPanel';

export default function App() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Listen for extension icon clicks
    const handleMessage = (request: any) => {
      if (request.action === 'toggleBottomBar') {
        setIsVisible(true);
        chrome.storage.local.set({ bottomBarHidden: false });
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Check initial visibility state
    chrome.storage.local.get(['bottomBarHidden'], (result) => {
      setIsVisible(!result.bottomBarHidden);
    });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    chrome.storage.local.set({ bottomBarHidden: true });
  };

  if (!isVisible) return null;

  return <BottomPanel onClose={handleClose} />;
}