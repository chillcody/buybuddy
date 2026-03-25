# BuyBuddy AI Chatbot — Setup & Build Guide

## What was built

A full AI chatbot for your Shopify store powered by Claude AI. It lets customers:
- Search products using natural language ("show me blue shoes under $100")
- Check order status by order number or email
- Ask about product availability and variants
- Have natural multi-turn conversations

---

## Project structure

```
BuyBuddy/
├── .env                        ← API keys (NEVER commit this)
├── .gitignore
├── package.json
├── server.js                   ← Express server (entry point)
├── get-shopify-token.js        ← OAuth helper to get Shopify token
│
├── src/
│   ├── routes/
│   │   └── chat.js             ← POST /api/chat endpoint
│   ├── services/
│   │   ├── claude.js           ← Claude API + tool-use loop
│   │   ├── shopify.js          ← Shopify GraphQL + REST API
│   │   └── sessions.js         ← In-memory conversation storage
│   ├── tools/
│   │   ├── definitions.js      ← Tool schemas Claude uses
│   │   └── executor.js         ← Runs tool calls
│   └── config/
│       └── prompts.js          ← System prompt (customize this)
│
└── widget/
    └── chatbot.js              ← Frontend chat widget (paste into Shopify)
```

---

## Step 1 — Add redirect URI to your Shopify app

Before getting the token, you must register the callback URL:

1. Go to **dev.shopify.com** → Your App → **Configuration** (or Settings)
2. Find **Allowed redirection URL(s)**
3. Add: `http://localhost:3001/callback`
4. Save

---

## Step 2 — Get your Shopify access token

Run the interactive helper:

```bash
npm run get-token
```

It will:
1. Ask for your store URL (e.g. `your-store.myshopify.com`)
2. Open a browser OAuth URL for you to paste
3. Listen for the Shopify redirect on port 3001
4. Exchange the code for a token automatically
5. Write the token to your `.env` file

---

## Step 3 — Start the server

```bash
npm run dev      # development (auto-restarts on file changes)
npm start        # production
```

Check it works: open `http://localhost:3000/health`

Expected response:
```json
{ "status": "ok", "shopify_token": "set", "model": "claude-haiku-4-5" }
```

---

## Step 4 — Add the widget to your Shopify store

1. In Shopify Admin go to **Online Store → Themes**
2. Click **Actions → Edit code**
3. Open **Layout → theme.liquid**
4. Find the closing `</body>` tag
5. Add this line just before it:

```html
<script src="https://YOUR-SERVER.com/widget/chatbot.js"></script>
```

Replace `YOUR-SERVER.com` with your deployed server URL (Railway, Render, etc.)

For local testing you can also paste the full contents of `widget/chatbot.js`
directly into a `<script>` tag in your theme.

---

## Step 5 — Deploy to production (recommended: Railway)

1. Push code to GitHub (make sure `.env` is in `.gitignore`)
2. Go to **railway.app** → New Project → Deploy from GitHub
3. Select your repo
4. Add all environment variables from your `.env` in the Railway dashboard
5. Railway gives you a URL like `https://buybuddy-xxx.railway.app`
6. Update `API_URL` at the top of `widget/chatbot.js` to your Railway URL
7. Update the widget `<script>` tag in your Shopify theme

---

## Customizing the chatbot

### System prompt
Edit `src/config/prompts.js` to:
- Change the store name
- Add your real return/shipping policies
- Add info about your product categories

### Widget appearance
Edit `widget/chatbot.js` — the variables at the top:
```js
var API_URL = 'https://YOUR-SERVER.com/api/chat';
var BOT_NAME = 'BuyBuddy';
var WELCOME_MSG = 'Hi! I am BuyBuddy...';
```

Colors are controlled in the `style.textContent` block — look for `#2563EB` (blue) and `#7C3AED` (purple).

### Model selection
In `.env`:
- `claude-haiku-4-5` — fast and cheap (good for most stores)
- `claude-sonnet-4-6` — smarter, better reasoning (higher cost)

---

## How the chatbot works (technical)

1. Customer types a message in the widget
2. Widget sends POST to `/api/chat` with `{ message, conversationId }`
3. Server loads conversation history from memory
4. Server calls Claude API with:
   - The conversation history
   - A system prompt defining the bot's personality
   - Tool definitions (search_products, get_order_status, check_product_inventory)
5. Claude decides if it needs to call a tool
6. If yes: server calls the Shopify API (GraphQL or REST), sends result back to Claude
7. Claude generates a natural language response
8. Server returns the response to the widget
9. Widget displays the message

This loop (steps 5-7) can repeat up to 5 times per message — e.g. Claude might
search for products, then check inventory on the best match.

---

## Estimated costs

| Usage | Model | Monthly cost |
|-------|-------|-------------|
| 500 conversations (~8 msgs each) | Haiku 4.5 | ~$2–5 |
| 2000 conversations | Haiku 4.5 | ~$8–15 |
| 2000 conversations | Sonnet 4.6 | ~$40–80 |

Set a spending limit in the Anthropic Console under **Billing** to avoid surprises.

---

## Security checklist

- `.env` is in `.gitignore` — never commit it
- Set CORS `origin` in `server.js` to only your Shopify domain in production
- Rate limiting is active: 20 messages per session per minute
- API keys are only on your server, never exposed to the browser
