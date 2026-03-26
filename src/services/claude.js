import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiTools } from '../tools/definitions.js';
import { executeTool } from '../tools/executor.js';
import { systemPrompt } from '../config/prompts.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const MAX_TOOL_ROUNDS = 5;

export async function chatWithClaude(userMessage, history) {
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: geminiTools }],
  });

  const chat = model.startChat({ history });

  let result = await chat.sendMessage(userMessage);
  let response = result.response;

  let rounds = 0;

  // Tool-use loop: Gemini may call tools before giving a final answer
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
