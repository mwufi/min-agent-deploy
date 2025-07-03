import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { pipedreamTools } from '@/lib/ai/pipedream-tools';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    maxSteps: 5, // Allow up to 5 steps for multi-step tool calling
    tools: pipedreamTools,
    onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
      // Log each step for monitoring and debugging
      console.log('Step finished:', {
        text: text?.slice(0, 100) + (text && text.length > 100 ? '...' : ''),
        toolCallsCount: toolCalls?.length || 0,
        toolResultsCount: toolResults?.length || 0,
        finishReason,
        usage,
      });
    },
    onFinish({ text, toolCalls, toolResults, usage, steps }) {
      // Log final completion
      console.log('Generation finished:', {
        finalText: text?.slice(0, 100) + (text && text.length > 100 ? '...' : ''),
        totalSteps: steps.length,
        totalToolCalls: steps.flatMap(step => step.toolCalls).length,
        totalUsage: usage,
      });
    },
  });

  return result.toDataStreamResponse();
}
