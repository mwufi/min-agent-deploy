import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { createPipedreamTools } from '@/lib/ai/pipedream-tools';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { messages } = await req.json();

  // Create tools with user context
  const userTools = createPipedreamTools(userId);

  const result = streamText({
    model: openai('gpt-4o'),
    messages,
    maxSteps: 5, // Allow up to 5 steps for multi-step tool calling
    tools: userTools,
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
