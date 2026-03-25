// In-memory session store.
// For production swap this out for Redis.

const sessions = new Map();
const MAX_MESSAGES = 20;   // keep last 20 messages
const TTL = 30 * 60 * 1000; // 30 minutes

export function getSession(id) {
  const s = sessions.get(id);
  if (!s) return [];
  if (Date.now() > s.expiresAt) {
    sessions.delete(id);
    return [];
  }
  return s.messages;
}

export function saveSession(id, messages) {
  sessions.set(id, {
    messages: messages.slice(-MAX_MESSAGES),
    expiresAt: Date.now() + TTL,
  });
}

// Clean up expired sessions every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(id);
  }
}, 15 * 60 * 1000);
