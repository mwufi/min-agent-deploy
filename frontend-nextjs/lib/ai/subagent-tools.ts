import { tool } from 'ai';
import { z } from 'zod';
import { SystemPrompts } from './system-prompts';
import { Agent, webSearchTool, run } from '@openai/agents';


export const launchSubagentTool = tool({
  description: 'Launch a sub-agent to complete a specific task independently',
  parameters: z.object({
    task: z.string().describe('The specific task for the sub-agent to complete'),
    delay: z.number().optional().describe('Optional delay in seconds before launching the sub-agent'),
    context: z.string().optional().describe('Additional context to provide to the sub-agent'),
    model: z.enum(['gpt-4o', 'gpt-4o-mini']).optional().default('gpt-4o-mini').describe('The model to use for the sub-agent')
  }),
  execute: async ({ task, delay, context, model }) => {
    // Apply delay if specified
    if (delay && delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay * 1000));
    }

    const startTime = Date.now();

    try {
      const agent = new Agent({
        name: 'Sierra',
        instructions: SystemPrompts.getSubAgentPrompt(task, context),
        tools: [webSearchTool()],
      });
      const result = await run(
        agent,
        task
      );

      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;

      return {
        success: true,
        task,
        result: result.finalOutput,
        model,
        executionTime,
        timestamp: new Date().toISOString(),
        usage: 0,
      };
    } catch (error) {
      const endTime = Date.now();
      const executionTime = (endTime - startTime) / 1000;

      return {
        success: false,
        task,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        model,
        executionTime,
        timestamp: new Date().toISOString(),
      };
    }
  },
});

export const subagentTools = {
  launchSubagent: launchSubagentTool,
};