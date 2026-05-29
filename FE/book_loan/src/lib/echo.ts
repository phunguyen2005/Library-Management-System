import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

(window as any).Pusher = Pusher;
Pusher.logToConsole = true;

const token = localStorage.getItem('auth_token');
const broadcaster = import.meta.env.VITE_BROADCASTER || 'pusher';

const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api';
// Dynamically resolve base domain (e.g., http://localhost:8000/api -> http://localhost:8000)
const baseDomain = apiBase.replace(/\/api$/, '');

const echoConfig: any = {
  broadcaster: broadcaster,
  key: import.meta.env.VITE_PUSHER_APP_KEY || import.meta.env.VITE_REVERB_APP_KEY || 'hcmue_library_key',
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap1',
  forceTLS: true,
  authEndpoint: `${baseDomain}/broadcasting/auth`,
  auth: {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    },
  },
};

// ONLY configure custom WebSocket hosts if broadcaster is reverb
if (broadcaster === 'reverb') {
  echoConfig.wsHost = import.meta.env.VITE_REVERB_HOST || '127.0.0.1';
  echoConfig.wsPort = parseInt(import.meta.env.VITE_REVERB_PORT || '8080');
  echoConfig.wssPort = parseInt(import.meta.env.VITE_REVERB_PORT || '8080');
  echoConfig.forceTLS = import.meta.env.VITE_REVERB_SCHEME === 'https';
  echoConfig.enabledTransports = ['ws', 'wss'];
}

export const echoClient = new Echo(echoConfig);

/**
 * Update the authorization token dynamically after authentication state changes.
 */
export const updateEchoAuth = (newToken: string | null) => {
  if (newToken) {
    echoClient.connector.options.auth.headers.Authorization = `Bearer ${newToken}`;
  } else {
    echoClient.connector.options.auth.headers.Authorization = '';
  }
  echoClient.connector.disconnect();
  echoClient.connector.connect();
};
