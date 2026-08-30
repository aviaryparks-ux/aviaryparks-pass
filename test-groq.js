const { generateText, tool } = require('ai');
const { createOpenAI } = require('@ai-sdk/openai');
const { z } = require('zod');
require('dotenv').config({ path: '.env.local' });

const groq = createOpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
});

async function main() {
  try {
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [{ role: 'user', content: 'total revenue berapa?' }],
      tools: {
        getFinancialAnalytics: tool({
          description: 'Ambil data laporan keuangan',
          parameters: z.object({
            transactionCategory: z.object({ value: z.string() }),
            timeframe: z.object({ value: z.string() })
          }),
          execute: async (args) => {
            console.log('EXECUTED WITH ARGS:', args);
            return { total: 1000 };
          }
        })
      }
    });
    console.log(result.toolCalls);
  } catch (e) {
    console.error(e);
  }
}
main();
