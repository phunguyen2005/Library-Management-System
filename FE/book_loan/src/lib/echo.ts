import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

(window as any).Pusher = Pusher;

const token = localStorage.getItem('auth_token');
const broadcaster = import.meta.env.VITE_BROADCASTER || 'pusher';

export const echoClient = new Echo({
  broadcaster: broadcaster,
  key: import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_PUSHER_APP_KEY || 'hcmue_library_key',
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap1',
  wsHost: import.meta.env.VITE_REVERB_HOST || '127.0.0.1',
  wsPort: parseInt(import.meta.env.VITE_REVERB_PORT || '8080'),
  wssPort: parseInt(import.meta.env.VITE_REVERB_PORT || '8080'),
  forceTLS: import.meta.env.VITE_REVERB_SCHEME === 'https' || import.meta.env.VITE_PUSHER_SCHEME === 'https' || true,
  enabledTransports: ['ws', 'wss'],
  authEndpoint: `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/broadcasting/auth`,
  auth: {
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    },
  },
});

/**
 * Update the authorization token dynamically after authentication state changes.
 */
export const updateEchoAuth = (newToken: string | null) => {
  if (newToken) {
    echoClient.connector.options.auth.headers.Authorization = `Bearer ${newToken}`;
  } else {
    echoClient.connector.options.auth.headers.Authorization = '';
  }
  // Reconnect to refresh credentials and session state cleanly
  echoClient.connector.disconnect();
  echoClient.connector.connect();
};
