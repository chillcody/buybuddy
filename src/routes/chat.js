import { Router } from 'express';
import { randomUUID } from 'crypto';
import { chatWithClaude } from '../services/claude.js';
import { getSession, saveSession, getSessionMessageCount } from '../services/sessions.js';

const router = Router();

// ── Limits ─────────────────────────────────────────────────────────────────
const MAX_MSG_LENGTH = 500;          // max characters per message
const MAX_TURNS_PER_CONVO = 15;      // max back-and-forth exchanges per session

// Per-IP: 30 messages per hour
const IP_LIMIT = 30;
const IP_WINDOW = 60 * 60 * 1000;   // 1 hour

// Per-session: 5 messages per minute (burst protection)
const SESSION_LIMIT = 5;
const SESSION_WINDOW = 60_000;       // 1 minute

const ipLimits = new Map();
const sessionLimits = new Map();

function checkLimit(map, key, max, windowMs) {
  const now = Date.now();
  const r = map.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > r.resetAt) { r.count = 0; r.resetAt = now + windowMs; }
  r.count++;
  map.set(key, r);
  return r.count <= max;
}

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipLimits) if (now > v.resetAt) ipLimits.delete(k);
  for (const [k, v] of sessionLimits) if (now > v.resetAt) sessionLimits.delete(k);
}, 60 * 60 * 1000);

router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > MAX_MSG_LENGTH) {
      return res.status(400).json({ error: `Message is too long (max ${MAX_MSG_LENGTH} characters).` });
    }

    const sessionId = conversationId || randomUUID();
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';

    // Check per-IP hourly limit
    if (!checkLimit(ipLimits, ip, IP_LIMIT, IP_WINDOW)) {
      return res.status(429).json({ error: 'You\'ve reached the hourly message limit. Please try again later.' });
    }

    // Check per-session burst limit
    if (!checkLimit(sessionLimits, sessionId, SESSION_LIMIT, SESSION_WINDOW)) {
      return res.status(429).json({ error: 'Slow down! Please wait a moment before sending more messages.' });
    }

    // Check max turns per conversation
    const turnCount = getSessionMessageCount(sessionId);
    if (turnCount >= MAX_TURNS_PER_CONVO * 2) {
      return res.status(429).json({ error: 'This conversation has reached its limit. Please refresh the page to start a new chat.' });
    }

    const history = getSession(sessionId);
    const { reply, updatedHistory } = await chatWithClaude(message.trim(), history);
    saveSession(sessionId, updatedHistory);

    res.json({ conversationId: sessionId, reply });
  } catch (err) {
    console.error('Chat error:', err?.message || err);
    const userMsg = err?.status === 429
      ? 'I\'m a little busy right now — please try again in a moment!'
      : 'I\'m having trouble responding right now. Please try again, or email us at support@p1peptides.com and we\'ll be happy to help.';
    res.status(500).json({ error: userMsg });
  }
});

export default router;
