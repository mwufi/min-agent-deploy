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

  const { messages, selectedGmailAccountId, selectedGmailAccountEmail } = await req.json();

  // Enhance messages with system context about selected Gmail account
  let contextualMessages = [...messages];

  // Add system message about selected Gmail account if one is selected
  if (selectedGmailAccountEmail) {
    const gmailContext = `The user has selected the Gmail account "${selectedGmailAccountEmail}" (ID: ${selectedGmailAccountId}). When performing Gmail operations, use this account by default unless the user explicitly asks to use a different account or all accounts.`;

    // Add as a system message at the beginning
    contextualMessages = [
      {
        role: 'system',
        content: gmailContext
      },
      ...messages
    ];
  } else if (selectedGmailAccountId === null) {
    // User selected "All accounts"
    contextualMessages = [
      {
        role: 'system',
        content: 'The user has selected to work with "All accounts". When performing Gmail operations, aggregate across all connected Gmail accounts unless specified otherwise.'
      },
      ...messages
    ];
  }

  // Create tools with user context and selected account
  const userTools = createPipedreamTools(userId, selectedGmailAccountId || undefined);

  const result = streamText({
    model: openai('gpt-4.1'),
    messages: contextualMessages,
    maxSteps: 7, // Allow up to 5 steps for multi-step tool calling
    tools: userTools,
    onStepFinish({ text, toolCalls, toolResults, finishReason, usage }) {
      // Log each step for monitoring and debugging
      console.log('Step finished:', {
        text: text?.slice(0, 100) + (text && text.length > 100 ? '...' : ''),
        toolCallsCount: toolCalls?.length || 0,
        toolResultsCount: toolResults?.length || 0,
        toolNames: toolCalls?.map(call => call.toolName) || [],
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
