'use client';

import { ToolLoading } from './ToolLoading';
import { 
  ListRecentThreads, 
  ViewThreadDetails, 
  FindEmails,
  ArchiveMessage,
  DeleteMessage,
  MarkAsRead,
  DraftMessage,
  SendEmail,
  ReplyInThread,
  ForwardEmail,
  ListGmailAccounts,
  ListLabels,
  AddLabel,
  SmartCompose,
  QuickReply
} from './GmailTools';
import {
  FindEmailsByLabel,
  SearchEmailsSmartly,
  AddLabelByName,
  RemoveLabelByName,
  ListRecentThreadsEnhanced
} from './GmailToolsEnhanced';
import {
  GetNotionPage,
  GetNotionPageContent,
  CreateNotionPage,
  FindNotionDatabase,
  QueryNotionDatabase,
  AddNotionDatabaseRecord,
  SearchNotion,
  SmartNotionAssistant
} from './NotionTools';
import { PipedreamTools } from './PipedreamTools';
import { Weather } from '../../weather';

interface ToolRendererProps {
  toolInvocation: any;
  showJson?: Record<string, boolean>;
  toggleJson?: (id: string) => void;
}

export function ToolRenderer({ toolInvocation, showJson = {}, toggleJson }: ToolRendererProps) {
  const { toolName, state, args, result, toolCallId } = toolInvocation;

  // Show loading state
  if (state === 'call') {
    return <ToolLoading toolName={toolName} args={args} />;
  }

  // Show results
  if (state === 'result') {
    switch (toolName) {
      // Enhanced Gmail tools
      case 'findEmailsByLabel':
        return <FindEmailsByLabel result={result} />;
      case 'searchEmailsSmartly':
        return <SearchEmailsSmartly result={result} />;
      case 'addLabelByName':
        return <AddLabelByName result={result} />;
      case 'removeLabelByName':
        return <RemoveLabelByName result={result} />;
      
      // Gmail tools
      case 'listRecentThreads':
        return result.error || result.suggestions ? 
          <ListRecentThreadsEnhanced result={result} /> : 
          <ListRecentThreads result={result} />;
      case 'viewThreadDetails':
        return <ViewThreadDetails result={result} />;
      case 'findEmails':
        return <FindEmails result={result} />;
      case 'archiveMessage':
        return <ArchiveMessage result={result} />;
      case 'deleteMessage':
        return <DeleteMessage result={result} />;
      case 'markAsRead':
        return <MarkAsRead result={result} />;
      case 'draftMessage':
        return <DraftMessage result={result} />;
      case 'sendEmail':
        return <SendEmail result={result} />;
      case 'replyInThread':
        return <ReplyInThread result={result} />;
      case 'forwardEmail':
        return <ForwardEmail result={result} />;
      case 'listGmailAccounts':
        return <ListGmailAccounts result={result} />;
      case 'listLabels':
        return <ListLabels result={result} />;
      case 'addLabel':
        return <AddLabel result={result} />;
      case 'smartCompose':
        return <SmartCompose result={result} />;
      case 'quickReply':
        return <QuickReply result={result} />;
      
      // Notion tools
      case 'getNotionPage':
        return <GetNotionPage result={result} />;
      case 'getNotionPageContent':
        return <GetNotionPageContent result={result} />;
      case 'createNotionPage':
        return <CreateNotionPage result={result} />;
      case 'updateNotionPage':
        return <CreateNotionPage result={result} />; // Reuse create component
      case 'getNotionSubPages':
        return <QueryNotionDatabase result={result} />; // Similar display
      case 'findNotionDatabase':
        return <FindNotionDatabase result={result} />;
      case 'queryNotionDatabase':
        return <QueryNotionDatabase result={result} />;
      case 'addNotionDatabaseRecord':
        return <AddNotionDatabaseRecord result={result} />;
      case 'getNotionDatabaseSchema':
        return (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-2">Database Schema</h3>
            <div className="space-y-1">
              {result.properties?.map((prop: any) => (
                <div key={prop.id} className="text-sm">
                  <span className="font-medium text-gray-700">{prop.name}</span>
                  <span className="text-gray-500"> ({prop.type})</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'searchNotion':
        return <SearchNotion result={result} />;
      case 'appendNotionBlocks':
        return (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <span className="text-green-600">✅</span>
              <p className="text-sm text-green-800">
                {result.message || `Added ${result.blocksAdded} blocks successfully`}
              </p>
            </div>
          </div>
        );
      case 'smartNotionAssistant':
        return <SmartNotionAssistant result={result} />;
      
      // Pipedream tools
      case 'getConnectedServices':
        return <PipedreamTools.ConnectedServices result={result} />;
      case 'getConnectionDetails':
        return <PipedreamTools.ConnectionDetails result={result} showJson={showJson} toggleJson={toggleJson} />;
      case 'searchForPipedreamApps':
        return <PipedreamTools.SearchApps result={result} args={args} />;
      case 'getGmailMessages':
        return <PipedreamTools.GmailMessages result={result} />;
      
      // Weather
      case 'get_current_weather':
        return <Weather weatherAtLocation={result} />;
      
      // Default fallback
      default:
        return (
          <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              Tool result: {toolName}
            </p>
            {result && (
              <pre className="mt-2 text-xs bg-white p-2 rounded border overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        );
    }
  }

  return null;
}