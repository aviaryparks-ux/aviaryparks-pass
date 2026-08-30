"use client";

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('PWA ServiceWorker registered with scope:', registration.scope);
          })
          .catch((error) => {
            console.warn('PWA ServiceWorker registration failed:', error);
          });
      });
    }
  }, []);

  return null;
}
