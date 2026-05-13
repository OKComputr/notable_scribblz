import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Mark the platform on <body> so CSS can target macOS-only quirks
// (traffic-light spacer, etc.) without leaking into Win/Linux.
const ua = navigator.userAgent.toLowerCase();
if (ua.includes('mac os x')) document.body.classList.add('platform-mac');
else if (ua.includes('windows')) document.body.classList.add('platform-win');
else document.body.classList.add('platform-linux');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
