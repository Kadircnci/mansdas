"use client";

import { useEffect } from 'react';

export default function ChromeExtensionProtection() {
  useEffect(() => {
    // Chrome extension error handler
    const originalError = window.onerror;
    const originalUnhandledRejection = window.onunhandledrejection;
    
    window.onerror = function(message, source, lineno, colno, error) {
      // Ignore Chrome extension errors
      if (source && source.includes('chrome-extension://')) {
        console.warn('Chrome extension error ignored:', { message, source });
        return true;
      }
      
      // Ignore common extension injection errors
      if (typeof message === 'string' && (
          message.includes('t is not a function') ||
          message.includes('inject.js') ||
          message.includes('extension') ||
          message.includes('Cannot destructure property') && source?.includes('chrome-extension')
        )) {
        console.warn('Extension injection error ignored:', message);
        return true;
      }
      
      // Call original error handler
      if (originalError) {
        return originalError.call(this, message, source, lineno, colno, error);
      }
      return false;
    };
    
    window.onunhandledrejection = function(event) {
      // Ignore Chrome extension promise rejections
      if (event.reason?.stack?.includes('chrome-extension://')) {
        console.warn('Chrome extension promise rejection ignored:', event.reason);
        event.preventDefault();
        return;
      }
      
      // Call original handler
      if (originalUnhandledRejection) {
        return originalUnhandledRejection.call(window, event);
      }
    };
    
    // Cleanup on unmount
    return () => {
      window.onerror = originalError;
      window.onunhandledrejection = originalUnhandledRejection;
    };
  }, []);
  
  return null; // This component doesn't render anything
}