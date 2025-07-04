interface ToolLoadingProps {
  toolName: string;
  args?: any;
}

const toolIcons: Record<string, string> = {
  // Pipedream tools
  getConnectedServices: '🔗',
  getConnectionDetails: '🔍',
  searchForPipedreamApps: '🔎',
  
  // Gmail tools
  listRecentThreads: '📧',
  viewThreadDetails: '📨',
  archiveMessage: '📦',
  deleteMessage: '🗑️',
  addLabel: '🏷️',
  markAsRead: '👁️',
  findEmails: '🔍',
  draftMessage: '📝',
  sendEmail: '📤',
  replyInThread: '↩️',
  forwardEmail: '➡️',
  listGmailAccounts: '📧',
  listLabels: '🏷️',
  getGmailMessages: '📧',
  
  // Weather
  get_current_weather: '🌤️',
};

const toolDescriptions: Record<string, (args?: any) => string> = {
  // Pipedream
  getConnectedServices: () => 'Getting your connected services...',
  getConnectionDetails: (args) => `Getting details for connection ${args?.id}...`,
  searchForPipedreamApps: (args) => `Searching for "${args?.query}"...`,
  
  // Gmail
  listRecentThreads: (args) => args?.query 
    ? `Searching for threads matching "${args.query}"...` 
    : 'Loading recent email threads...',
  viewThreadDetails: (args) => `Loading thread details...`,
  archiveMessage: () => 'Archiving message...',
  deleteMessage: () => 'Deleting message...',
  addLabel: () => 'Adding labels...',
  markAsRead: (args) => `Marking message as ${args?.read ? 'read' : 'unread'}...`,
  findEmails: (args) => `Searching for emails: "${args?.query}"...`,
  draftMessage: () => 'Creating draft...',
  sendEmail: () => 'Sending email...',
  replyInThread: () => 'Sending reply...',
  forwardEmail: () => 'Forwarding email...',
  listGmailAccounts: () => 'Loading Gmail accounts...',
  listLabels: () => 'Loading labels...',
  getGmailMessages: () => 'Loading Gmail messages...',
  
  // Weather
  get_current_weather: (args) => `Getting weather for ${args?.location}...`,
};

export function ToolLoading({ toolName, args }: ToolLoadingProps) {
  const icon = toolIcons[toolName] || '⚙️';
  const getDescription = toolDescriptions[toolName] || (() => `Processing ${toolName}...`);
  
  return (
    <div className="flex items-center py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
      <div className="flex-1">
        <span className="text-sm font-medium text-blue-900">
          {icon} {getDescription(args)}
        </span>
      </div>
    </div>
  );
}