import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import chatRouter from './src/routes/chat.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow your Shopify store and localhost during dev
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:8080',
];
if (process.env.SHOPIFY_STORE_URL) {
  allowedOrigins.push(`https://${process.env.SHOPIFY_STORE_URL}`);
}

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (Postman, curl) and allowed origins
      if (!origin || allowedOrigins.some((o) => origin.startsWith(o))) {
        cb(null, true);
      } else {
        cb(null, true); // Dev: allow all. In production, restrict to your Shopify domain.
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '2mb' }));

// Serve the chat widget JS file statically
app.use('/widget', express.static(path.join(__dirname, 'widget')));

// API routes
app.use('/api', chatRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    model: process.env.GROQ_MODEL,
    store: process.env.SHOPIFY_STORE_URL || 'not configured',
    shopify_token: process.env.SHOPIFY_ACCESS_TOKEN ? 'set' : 'MISSING',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('BuyBuddy Chatbot Server');
  console.log(`Running on: http://localhost:${PORT}`);
  console.log(`Store: ${process.env.SHOPIFY_STORE_URL || 'NOT SET — add to .env'}`);
  console.log(`Token: ${process.env.SHOPIFY_ACCESS_TOKEN ? 'OK' : 'MISSING — run: npm run get-token'}`);
  console.log(`Widget: http://localhost:${PORT}/widget/chatbot.js`);

  console.log(`AI: Groq / ${process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'}`);
});
