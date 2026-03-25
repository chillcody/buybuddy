/**
 * BuyBuddy — Shopify OAuth Token Helper
 * Run: node get-shopify-token.js
 *
 * Uses example.com/callback as the redirect URI (no registration needed).
 * You just copy the URL from your browser after clicking Install.
 */

import 'dotenv/config';
import { createInterface } from 'readline';
import { readFileSync, writeFileSync } from 'fs';

const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('ERROR: SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET must be set in .env');
  process.exit(1);
}

const SCOPES = 'read_products,read_orders,read_customers,read_inventory';
const REDIRECT_URI = 'https://example.com/callback';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, r));

async function main() {
  console.log('\n=== BuyBuddy: Shopify Access Token Setup ===\n');

  // Store is p1peptides — use their myshopify domain
  const storeInput = (await ask('Enter your store myshopify URL (e.g. p1peptides.myshopify.com): ')).trim();
  if (!storeInput) { console.error('Store URL is required'); process.exit(1); }

  const store = storeInput.replace('https://', '').replace('http://', '').replace(/\/$/, '');

  const authUrl =
    `https://${store}/admin/oauth/authorize` +
    `?client_id=${CLIENT_ID}` +
    `&scope=${SCOPES}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

  console.log('\n---------------------------------------------------------');
  console.log('STEP 1: Copy this URL and open it in your browser:\n');
  console.log(authUrl);
  console.log('\n---------------------------------------------------------');
  console.log('STEP 2: On the Shopify page that opens, click "Install".');
  console.log('\nSTEP 3: Your browser will redirect to example.com');
  console.log('        The page will just say "Example Domain" — that is normal!');
  console.log('        Look at the URL bar — it will look like:');
  console.log('        https://example.com/callback?code=XXXXXX&hmac=...');
  console.log('\nSTEP 4: Copy the FULL URL from your browser address bar.');
  console.log('---------------------------------------------------------\n');

  const redirectedUrl = (await ask('Paste the full URL from your browser here: ')).trim();

  // Parse the code from the URL
  let code;
  try {
    const parsed = new URL(redirectedUrl);
    code = parsed.searchParams.get('code');
  } catch {
    // Maybe they only pasted the code itself
    code = redirectedUrl.includes('code=')
      ? redirectedUrl.match(/[?&]code=([^&]+)/)?.[1]
      : redirectedUrl;
  }

  if (!code) {
    console.error('\nERROR: Could not find the authorization code in that URL.');
    console.error('Make sure you copied the full URL from the browser address bar after clicking Install.');
    process.exit(1);
  }

  console.log('\nGot the code. Exchanging for access token...');

  const tokenRes = await fetch(`https://${store}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error('\nERROR: Token exchange failed:', tokenRes.status, text);
    console.error('The code may have expired (they expire in ~60 seconds).');
    console.error('Run this script again quickly after clicking Install.\n');
    process.exit(1);
  }

  const body = await tokenRes.json();
  const access_token = body.access_token;

  if (!access_token) {
    console.error('\nERROR: No access_token in response:', JSON.stringify(body));
    process.exit(1);
  }

  console.log('\nSuccess! Access token obtained.');
  console.log('Scopes:', body.scope);

  // Update .env file
  let env = readFileSync('.env', 'utf-8');
  env = env.replace(/^SHOPIFY_STORE_URL=.*/m, `SHOPIFY_STORE_URL=${store}`);
  env = env.replace(/^SHOPIFY_ACCESS_TOKEN=.*/m, `SHOPIFY_ACCESS_TOKEN=${access_token}`);
  writeFileSync('.env', env);

  console.log('\n.env has been updated:');
  console.log(`  SHOPIFY_STORE_URL = ${store}`);
  console.log(`  SHOPIFY_ACCESS_TOKEN = ${access_token.slice(0, 10)}...`);
  console.log('\nAll done! Now run: npm run dev\n');

  rl.close();
}

main().catch((err) => {
  console.error('\nError:', err.message);
  rl.close();
  process.exit(1);
});
