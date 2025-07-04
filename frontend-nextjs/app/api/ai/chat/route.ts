import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { auth } from '@clerk/nextjs/server';
import { createPipedreamTools } from '@/lib/ai/pipedream-tools';
import { createGmailToolsEnhanced } from '@/lib/ai/gmail-tools-enhanced';
import { createGmailTools } from '@/lib/ai/gmail-tools';
import { createGmailComposeTool } from '@/lib/ai/gmail-compose-tool';
import { createAllNotionTools } from '@/lib/notion/wrappedTools';

export const maxDuration = 30;

const PERSISTENT_SYSTEM_PROMPT = `You are a helpful AI assistant with access to Gmail and Notion tools. 

IMPORTANT PERSONALITY TRAITS:
1. BE PERSISTENT: If something doesn't work the first time, try different approaches. Don't give up easily.
2. BE CURIOUS: If you get no results, investigate why. Try variations, check spellings, look for alternatives.
3. BE PROACTIVE: Anticipate what the user might need next. If a search returns nothing, suggest what to try.
4. BE THOROUGH: When searching fails, try multiple strategies before concluding there are no results.

GMAIL SEARCH STRATEGIES:
- If searching by label returns nothing, list all labels to see what's available
- If searching by sender returns nothing, try partial email addresses or just the domain
- If a complex search fails, break it down into simpler searches
- Always explain what you're trying and why

NOTION STRATEGIES:
- If searching for a database by name fails, try searching for similar names or list all databases
- When creating pages, ask for parent page/database if not specified
- For database operations, get the schema first to understand available properties
- Use natural language requests with the smartNotionAssistant tool when appropriate

EXAMPLES OF GOOD PERSISTENCE:
- User: "Show me emails from John"
  If no results: Try "from:john", then try listing recent emails to see if John uses a different email
  
- User: "What's in my Work label?"
  If label not found: List all labels first, find similar ones, suggest alternatives

- User: "Add a task to my Tasks database"
  If database not found: Search for databases with similar names, list available databases

Remember: Users often misremember exact names, spellings, or labels. Be smart about finding what they actually want.`;

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const {
    messages,
    selectedGmailAccountId,
    selectedGmailAccountEmail,
    selectedNotionAccountId,
    selectedNotionAccountName
  } = await req.json();

  let systemMessage = PERSISTENT_SYSTEM_PROMPT;

  // Add Gmail account context
  if (selectedGmailAccountEmail) {
    systemMessage += `The user has selected the Gmail account "${selectedGmailAccountEmail}" (ID: ${selectedGmailAccountId}). When performing Gmail operations, use this account by default unless the user explicitly asks to use a different account or all accounts.`;
  } else if (selectedGmailAccountId === null) {
    systemMessage += 'The user has selected to work with "All accounts". When performing Gmail operations, aggregate across all connected Gmail accounts unless specified otherwise.';
  }

  // Add Notion account context
  if (selectedNotionAccountName) {
    systemMessage += `The user has selected the Notion workspace "${selectedNotionAccountName}" (ID: ${selectedNotionAccountId}). When performing Notion operations, use this workspace by default unless the user explicitly asks to use a different workspace.`;
  } else if (selectedNotionAccountId === null) {
    systemMessage += 'The user has selected to work with "All workspaces". When performing Notion operations, search across all connected workspaces unless specified otherwise.';
  }

  // Create all tool sets
  const pipedreamTools = createPipedreamTools(userId, selectedGmailAccountId || undefined);
  const enhancedGmailTools = createGmailToolsEnhanced(userId, selectedGmailAccountId || undefined);
  const originalGmailTools = createGmailTools(userId, selectedGmailAccountId || undefined);
  const composeTools = createGmailComposeTool(userId, selectedGmailAccountId || undefined);
  const notionTools = createAllNotionTools(userId, selectedNotionAccountId || undefined); // Add Notion tools

  // Combine all tools, with enhanced tools taking precedence
  const allTools = {
    ...pipedreamTools,
    ...originalGmailTools,
    ...composeTools,
    ...enhancedGmailTools, // Enhanced tools override originals where there's overlap
    ...notionTools, // Add all Notion tools
  };

  console.log("systemMessage", systemMessage);

  try {
    const result = streamText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        ...messages
      ],
      maxSteps: 10, // Increased for persistence
      tools: allTools,
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
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
