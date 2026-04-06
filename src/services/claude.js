import { systemPrompt } from '../config/prompts.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function chatWithClaude(userMessage, history) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    if (fetchErr.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw fetchErr;
  }
  clearTimeout(timeout);

  if (!res.ok) {
    const err = await res.text();
    const status = res.status;
    if (status === 429) {
      const e = new Error('Rate limit reached');
      e.status = 429;
      throw e;
    }
    throw new Error(`Groq API error ${status}: ${err}`);
  }

  const data = await res.json();
  const reply = data.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';

  const updatedHistory = [
    ...history,
    { role: 'user', content: userMessage },
    { role: 'assistant', content: reply },
  ];

  return { reply, updatedHistory };
}
