import { io } from 'socket.io-client';

// In dev: Vite proxies /socket.io → localhost:3001
// In prod: Netlify proxies /socket.io → backend
const URL = import.meta.env.VITE_API_URL || window.location.origin;

export const socket = io(URL, {
  autoConnect: true,
  reconnectionDelay: 2000,
  reconnectionAttempts: 10,
});
