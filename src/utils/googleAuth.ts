// Pure client-side Google OAuth 2.0 Implicit Flow
import firebaseConfig from '../../firebase-applet-config.json';

const CLIENT_ID = (firebaseConfig as any).oAuthClientId || '49213146535-rmdpdgtlh0r0q4k8udb3vthdpqate7t6.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/gmail.send'
];

let cachedAccessToken: string | null = localStorage.getItem('google_access_token');
let cachedUser: any = null;
try {
  const storedUser = localStorage.getItem('google_user_profile');
  if (storedUser) cachedUser = JSON.parse(storedUser);
} catch (e) {}

const listeners: Array<(user: any, token: string | null) => void> = [];

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  const handler = (user: any, token: string | null) => {
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      if (onAuthFailure) onAuthFailure();
    }
  };

  listeners.push(handler);
  
  // Immediately trigger if we already have a cached token and user
  if (cachedUser && cachedAccessToken) {
    setTimeout(() => handler(cachedUser, cachedAccessToken), 100);
  } else {
    setTimeout(() => {
      if (onAuthFailure) onAuthFailure();
    }, 100);
  }

  // Set up message listener for the popup redirect
  const messageListener = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === 'GOOGLE_OAUTH_TOKEN' && event.data?.hash) {
      const params = new URLSearchParams(event.data.hash.substring(1));
      const accessToken = params.get('access_token');
      if (accessToken) {
        handleTokenReceived(accessToken);
      }
    }
  };
  window.addEventListener('message', messageListener);

  return () => {
    const idx = listeners.indexOf(handler);
    if (idx !== -1) listeners.splice(idx, 1);
    window.removeEventListener('message', messageListener);
  };
};

async function handleTokenReceived(accessToken: string): Promise<any> {
  try {
    cachedAccessToken = accessToken;
    localStorage.setItem('google_access_token', accessToken);

    // Fetch user details from Google userinfo API
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!res.ok) throw new Error('Failed to fetch userinfo from Google');
    
    const profile = await res.json();
    cachedUser = {
      uid: profile.sub,
      displayName: profile.name,
      email: profile.email,
      photoURL: profile.picture
    };
    
    localStorage.setItem('google_user_profile', JSON.stringify(cachedUser));

    // Notify all listeners
    listeners.forEach(l => l(cachedUser, accessToken));
    return { user: cachedUser, accessToken };
  } catch (err) {
    console.error('Error completing Google login profile fetch:', err);
    throw err;
  }
}

// Google Sign-In with direct popup
export const googleSignIn = async (): Promise<{ user: any; accessToken: string } | null> => {
  return new Promise((resolve, reject) => {
    const redirectUri = window.location.origin;
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(SCOPES.join(' '))}&prompt=consent`;
    
    const popup = window.open(url, 'GoogleAuth', 'width=550,height=650');
    if (!popup) {
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }

    // Set up a one-time message listener for this sign-in attempt
    const tempListener = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'GOOGLE_OAUTH_TOKEN' && event.data?.hash) {
        window.removeEventListener('message', tempListener);
        const params = new URLSearchParams(event.data.hash.substring(1));
        const accessToken = params.get('access_token');
        if (accessToken) {
          try {
            const result = await handleTokenReceived(accessToken);
            resolve(result);
          } catch (err) {
            reject(err);
          }
        } else {
          reject(new Error('No access token received.'));
        }
      }
    };
    window.addEventListener('message', tempListener);

    // Check if popup is closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', tempListener);
        // We'll wait a bit in case message listener resolved it right before closing
        setTimeout(() => {
          if (!cachedAccessToken) {
            reject(new Error('Sign-in popup closed by user.'));
          }
        }, 500);
      }
    }, 1000);
  });
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  cachedAccessToken = null;
  cachedUser = null;
  localStorage.removeItem('google_access_token');
  localStorage.removeItem('google_user_profile');
  listeners.forEach(l => l(null, null));
};

// Helper to construct and send raw MIME email via Gmail API
export async function sendGmailEmail(
  accessToken: string,
  fromEmail: string,
  toEmail: string,
  subject: string,
  body: string
): Promise<any> {
  const mimeParts = [
    `From: ${fromEmail}`,
    `To: ${toEmail}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    body
  ];
  const mimeMessage = mimeParts.join('\r\n');

  // Safely base64url encode the string
  const base64 = btoa(unescape(encodeURIComponent(mimeMessage)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: base64 })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail Send Error (${response.status}): ${errText}`);
  }

  return response.json();
}

