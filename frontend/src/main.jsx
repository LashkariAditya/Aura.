import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { MusicProvider } from './context/MusicContext';
import { SyncProvider } from './context/SyncContext';
import { ThemeProvider } from './context/ThemeContext';
import { KindeProvider } from "@kinde-oss/kinde-auth-react";

// Fallbacks prevent 'new URL()' from throwing Invalid URL and blanking the entire page 
// when Vercel environment variables are missing or undefined.
const kindeDomain = import.meta.env.VITE_KINDE_DOMAIN || 'https://fallback.kinde.com';
const kindeRedirectUri = import.meta.env.VITE_KINDE_REDIRECT_URL || window.location.origin;
const kindeLogoutUri = import.meta.env.VITE_KINDE_LOGOUT_URL || window.location.origin;

// Unregister stale service workers in development to prevent console noise
// (e.g., "navigation preload request was cancelled" from a previous production build)
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(regs => {
        for (const r of regs) r.unregister();
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <KindeProvider
        clientId={import.meta.env.VITE_KINDE_CLIENT_ID || 'fallback_id'}
        domain={kindeDomain}
        redirectUri={kindeRedirectUri}
        logoutUri={kindeLogoutUri}
      >
        <ThemeProvider>
          <AuthProvider>
            <MusicProvider>
              <SyncProvider>
                <App />
              </SyncProvider>
            </MusicProvider>
          </AuthProvider>
        </ThemeProvider>
      </KindeProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
