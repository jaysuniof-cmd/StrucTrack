// Handle Google OAuth 2.0 redirect popup
if (window.location.hash && window.location.hash.includes('access_token=')) {
  if (window.opener) {
    window.opener.postMessage({
      type: 'GOOGLE_OAUTH_TOKEN',
      hash: window.location.hash
    }, window.location.origin);
    window.close();
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

