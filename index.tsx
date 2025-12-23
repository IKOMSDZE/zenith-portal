
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Database } from './services/database';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

// Performance optimization: Warm up the cache with static settings/branches 
// before or during the initial render.
Database.warmup();

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
