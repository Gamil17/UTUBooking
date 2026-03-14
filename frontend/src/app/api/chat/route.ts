import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import redis from '@/lib/redis';
import { TOOL_DEFINITIONS, executeTool } from '@/lib/ai-tools';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_HISTORY = 50;
const HISTORY_TTL = 86400; // 24 hours

// ─── SSE Helper ───────────────────────────────────────────────────────────────

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(lang: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const isArabic = lang === 'ar';
  return [
    `You are AMEC, a warm and knowledgeable AI travel assistant for UTUBooking — the leading Hajj and Umrah booking platform serving pilgrims worldwide.`,
    `Today is ${today}.`,
    isArabic
      ? 'Always respond in Arabic. Use formal but friendly Arabic suitable for all pilgrims.'
      : 'Always respond in English. Be warm, clear, and concise.',
    `You specialise in:
- Hotels near the Grand Mosque (Haram) in Makkah and Madinah — show prices in SAR and distances in metres
- Flights via Jeddah King Abdulaziz (JED) or Prince Mohammad bin Abdulaziz (MED) airports
- Complete Umrah and Hajj trip packages

When a user asks about hotels, flights, or trip planning, ALWAYS use your search tools first to get real data before responding.
After showing results, offer to help with booking steps or answer follow-up questions.
Keep responses concise — use bullet points and emojis to make information scannable.
Never invent hotel names, prices, or flight details — always use the tool results.`,
  ].join('\n\n');
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { message, sessionId, lang = 'en' } = await req.json() as {
    message: string;
    sessionId: string;
    lang?: string;
  };

  if (!message?.trim() || !sessionId) {
    return new Response(JSON.stringify({ error: 'Missing message or sessionId' }), { status: 400 });
  }

  // Set up SSE stream
  const { readable, writable } = new TransformStream<string, string>();
  const writer = writable.getWriter();

  const write = (data: Record<string, unknown>) =>
    writer.write(sseEvent(data));

  const historyKey = `chat:history:${sessionId}`;
  const startTime = Date.now();

  // Run agentic loop in background (don't await — response already started)
  (async () => {
    try {
      // Load conversation history from Redis
      const rawHistory = await redis.lrange(historyKey, 0, MAX_HISTORY - 1);
      const history: Anthropic.MessageParam[] = rawHistory
        .map(h => {
          try { return JSON.parse(h) as Anthropic.MessageParam; } catch { return null; }
        })
        .filter((m): m is Anthropic.MessageParam => m !== null)
        .reverse(); // Redis LPUSH stores newest first

      // Add the new user message
      const messages: Anthropic.MessageParam[] = [
        ...history,
        { role: 'user', content: message },
      ];

      let assistantText = '';
      const toolsUsed: string[] = [];
      let inputTokens = 0;
      let outputTokens = 0;

      // Agentic loop — continues until no more tool calls
      for (let iteration = 0; iteration < 5; iteration++) {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: buildSystemPrompt(lang),
          tools: TOOL_DEFINITIONS,
          messages,
        });

        inputTokens += response.usage.input_tokens;
        outputTokens += response.usage.output_tokens;

        // Stream text content blocks
        for (const block of response.content) {
          if (block.type === 'text' && block.text) {
            assistantText += block.text;
            await write({ type: 'text', text: block.text });
          }
        }

        // If no tool use, we're done
        if (response.stop_reason !== 'tool_use') break;

        // Execute all tool calls
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          toolsUsed.push(block.name);
          await write({ type: 'tool_start', name: block.name });

          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          await write({ type: 'tool_result', name: block.name, result });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }

        // Feed tool results back and continue
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });
      }

      await write({ type: 'done' });

      // Persist exchange to Redis history
      const userEntry: Anthropic.MessageParam = { role: 'user', content: message };
      const assistantEntry: Anthropic.MessageParam = { role: 'assistant', content: assistantText };
      await redis.lpush(historyKey, JSON.stringify(assistantEntry), JSON.stringify(userEntry));
      await redis.ltrim(historyKey, 0, MAX_HISTORY - 1);
      await redis.expire(historyKey, HISTORY_TTL);

      // Admin interaction log
      const logEntry = {
        sessionId,
        userMsg: message.slice(0, 500),
        assistantMsg: assistantText.slice(0, 1000),
        toolsUsed,
        inputTokens,
        outputTokens,
        durationMs: Date.now() - startTime,
        lang,
        ts: new Date().toISOString(),
      };
      await redis.rpush('ai:logs', JSON.stringify(logEntry));
    } catch (err) {
      console.error('[chat/route] error:', err);
      await write({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable as unknown as BodyInit, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    },
  });
}
