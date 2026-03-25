import Anthropic from '@anthropic-ai/sdk';
import { tools } from '../tools/definitions.js';
import { executeTool } from '../tools/executor.js';
import { systemPrompt } from '../config/prompts.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5';
const MAX_TOOL_ROUNDS = 5; // prevent infinite loops

export async function chatWithClaude(userMessage, history) {
  const messages = [
    ...history,
    { role: 'user', content: userMessage },
  ];

  let response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  });

  let rounds = 0;

  // Tool-use loop: Claude may call tools multiple times before giving a final answer
  while (response.stop_reason === 'tool_use' && rounds < MAX_TOOL_ROUNDS) {
    rounds++;

    // Collect all tool_use blocks (Claude can request multiple tools at once)
    const toolBlocks = response.content.filter((b) => b.type === 'tool_use');

    // Execute all tool calls (in parallel for speed)
    const toolResults = await Promise.all(
      toolBlocks.map(async (block) => {
        console.log(`[Tool] ${block.name}(${JSON.stringify(block.input)})`);
        const result = await executeTool(block.name, block.input);
        return {
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(result),
        };
      })
    );

    // Append assistant response and tool results to the conversation
    messages.push({ role: 'assistant', content: response.content });
    messages.push({ role: 'user', content: toolResults });

    // Ask Claude again with the tool results
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      tools,
      messages,
    });
  }

  // Extract final text reply
  const reply = response.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  // Add this exchange to history
  messages.push({ role: 'assistant', content: reply });

  return { reply, updatedHistory: messages };
}
