import { io } from 'socket.io-client';

// In dev: Vite proxies /socket.io → localhost:3001
// In prod: set VITE_API_URL to your deployed API URL
const URL = import.meta.env.VITE_API_URL || '';

export const socket = io(URL, {
  autoConnect: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 10,
});
