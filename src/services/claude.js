import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeTool } from '../tools/executor.js';
import { systemPrompt } from '../config/prompts.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const tools = [
  {
    functionDeclarations: [
      {
        name: 'search_products',
        description: 'Search the P1 Peptides product catalog. Use when a customer asks about products, pricing, or recommendations.',
        parameters: {
          type: 'OBJECT',
          properties: {
            query: { type: 'STRING', description: 'Search query' },
            limit: { type: 'NUMBER', description: 'Max results (default 4)' },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_order_status',
        description: 'Look up order status by order number or email.',
        parameters: {
          type: 'OBJECT',
          properties: {
            order_number: { type: 'STRING', description: 'Order number' },
            email: { type: 'STRING', description: 'Customer email' },
          },
        },
      },
      {
        name: 'check_product_inventory',
        description: 'Check inventory for a specific product ID.',
        parameters: {
          type: 'OBJECT',
          properties: {
            product_id: { type: 'STRING', description: 'Shopify product ID' },
          },
          required: ['product_id'],
        },
      },
    ],
  },
];

export async function chatWithClaude(userMessage, history) {
  const model = genAI.getGenerativeModel(
    { model: MODEL, systemInstruction: systemPrompt, tools },
    { apiVersion: 'v1' }
  );

  const chat = model.startChat({ history });

  let result = await chat.sendMessage(userMessage);
  let response = result.response;

  let rounds = 0;
  const MAX_TOOL_ROUNDS = 5;

  while (rounds < MAX_TOOL_ROUNDS) {
    const calls = response.functionCalls();
    if (!calls || calls.length === 0) break;
    rounds++;

    const toolResults = await Promise.all(
      calls.map(async (call) => {
        console.log(`[Tool] ${call.name}(${JSON.stringify(call.args)})`);
        const res = await executeTool(call.name, call.args);
        return {
          functionResponse: {
            name: call.name,
            response: { result: res },
          },
        };
      })
    );

    result = await chat.sendMessage(toolResults);
    response = result.response;
  }

  const reply = response.text();
  const updatedHistory = await chat.getHistory();

  return { reply, updatedHistory };
}
