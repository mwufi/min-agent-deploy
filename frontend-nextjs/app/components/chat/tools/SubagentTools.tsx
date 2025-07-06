import React from 'react';
import { Bot, Clock, AlertCircle, CheckCircle } from 'lucide-react';

interface SubagentResult {
  success: boolean;
  task: string;
  result?: string;
  error?: string;
  model?: string;
  executionTime?: number;
  timestamp?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface SubagentToolsProps {
  toolName: string;
  args: any;
  result: SubagentResult;
}

export function SubagentTools({ toolName, args, result }: SubagentToolsProps) {
  if (toolName === 'launchSubagent') {
    return <LaunchSubagentResult args={args} result={result} />;
  }

  return null;
}

function LaunchSubagentResult({ args, result }: { args: any; result: SubagentResult }) {
  const formatExecutionTime = (seconds?: number) => {
    if (!seconds) return 'N/A';
    return seconds < 1 ? `${(seconds * 1000).toFixed(0)}ms` : `${seconds.toFixed(2)}s`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Bot className="h-4 w-4 text-blue-500" />
        <span>Sub-agent Task</span>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
        <div className="space-y-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">Task:</div>
          <div className="text-sm font-medium">{args.task}</div>
        </div>

        {args.context && (
          <div className="space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">Context:</div>
            <div className="text-sm">{args.context}</div>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-400">
              {formatExecutionTime(result.executionTime)}
            </span>
          </div>
          {result.model && (
            <div className="text-gray-600 dark:text-gray-400">
              Model: {result.model}
            </div>
          )}
          {args.delay && (
            <div className="text-gray-600 dark:text-gray-400">
              Delay: {args.delay}s
            </div>
          )}
        </div>
      </div>

      <div className={`rounded-lg p-4 ${
        result.success 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}>
        <div className="flex items-start gap-3">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
          )}
          <div className="flex-1 space-y-2">
            <div className="font-medium text-sm">
              {result.success ? 'Sub-agent completed successfully' : 'Sub-agent failed'}
            </div>
            {result.success && result.result && (
              <div className="text-sm whitespace-pre-wrap">{result.result}</div>
            )}
            {!result.success && result.error && (
              <div className="text-sm text-red-700 dark:text-red-300">{result.error}</div>
            )}
          </div>
        </div>
      </div>

      {result.usage && (
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-3">
          <span>Tokens used: {result.usage.totalTokens}</span>
          <span>(Prompt: {result.usage.promptTokens}, Completion: {result.usage.completionTokens})</span>
        </div>
      )}
    </div>
  );
}