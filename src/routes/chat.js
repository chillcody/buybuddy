import { Router } from 'express';
import { randomUUID } from 'crypto';
import { chatWithClaude } from '../services/claude.js';
import { getSession, saveSession } from '../services/sessions.js';

const router = Router();

// Simple in-memory rate limiter
const rateLimits = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW = 60_000; // 1 minute

function checkRateLimit(id) {
  const now = Date.now();
  const r = rateLimits.get(id) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > r.resetAt) {
    r.count = 0;
    r.resetAt = now + RATE_WINDOW;
  }
  r.count++;
  rateLimits.set(id, r);
  return r.count <= RATE_LIMIT;
}

router.post('/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message is too long (max 2000 characters).' });
    }

    const sessionId = conversationId || randomUUID();

    if (!checkRateLimit(sessionId)) {
      return res.status(429).json({ error: 'Too many messages. Please wait a moment.' });
    }

    const history = getSession(sessionId);
    const { reply, updatedHistory } = await chatWithClaude(message.trim(), history);
    saveSession(sessionId, updatedHistory);

    res.json({ conversationId: sessionId, reply });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

export default router;
