# Notion Integration

A comprehensive Notion API integration for AI agents, providing clean abstractions for working with pages, databases, and blocks.

## Architecture

```
/lib/notion
  /core              # Core functionality
    pages.ts         # Page operations
    blocks.ts        # Block operations  
    databases.ts     # Database operations
    index.ts         # Core exports
  /utils             # Utilities
    parser.ts        # Rich text parsing, markdown conversion
  /wrappedTools      # AI-ready tools
    smartNotionAssistant.ts  # High-level assistant
    index.ts         # Tool exports
  client.ts          # Notion API client with Pipedream proxy
  tools.ts           # AI tool definitions
  examples.ts        # Usage examples
```

## Features

### Core Functions

#### Pages
- `getPage(pageId)` - Retrieve page details
- `getPageContent(pageId, format)` - Get content as markdown or blocks
- `createPageWithContent(params)` - Create pages with rich content
- `updatePage(pageId, properties)` - Update page properties
- `getSubPages(pageId)` - Fetch all sub-pages

#### Databases
- `findDatabaseByName(name)` - Find database by name
- `getDatabase(databaseId)` - Get database details
- `getDatabaseSchema(databaseId)` - Get property definitions
- `queryDatabase(databaseId, params)` - Query with filters/sorts
- `addRecordToDatabase(databaseId, properties)` - Add new records

#### Blocks
- `getBlockChildren(blockId)` - Get child blocks
- `appendBlocks(parentId, blocks)` - Add content to pages
- `BlockBuilders` - Helpers for creating different block types

### AI Tools

All tools are designed for AI agents with:
- Natural language descriptions
- Structured parameters
- Error handling with suggestions
- Simplified responses

#### Standard Tools
- `getNotionPage` - Get page by ID
- `getNotionPageContent` - Get page content as markdown/blocks  
- `createNotionPage` - Create new pages
- `updateNotionPage` - Update page properties
- `getNotionSubPages` - List sub-pages
- `findNotionDatabase` - Find database by name
- `queryNotionDatabase` - Query with filters
- `addNotionDatabaseRecord` - Add database records
- `getNotionDatabaseSchema` - Get property definitions
- `searchNotion` - Search all content
- `appendNotionBlocks` - Add content blocks

#### Smart Assistant
- `smartNotionAssistant` - Handles natural language requests like:
  - "Add a meeting note to my Notes database"
  - "Create a project page called Project X"
  - "Find all tasks due this week"

## Usage Examples

### Basic Usage

```typescript
import { 
  getPageContent, 
  createPageWithContent,
  findDatabaseByName,
  addRecordToDatabase,
  BlockBuilders 
} from '@/lib/notion/core';

// Get page content as markdown
const content = await getPageContent(userId, pageId, 'markdown');

// Create a page with content
const page = await createPageWithContent(userId, {
  title: 'My New Page',
  parent: { type: 'workspace' },
  content: [
    BlockBuilders.heading1('Welcome'),
    BlockBuilders.paragraph('This is my content'),
    BlockBuilders.image('https://example.com/image.jpg')
  ],
  icon: '📄'
});

// Work with databases
const db = await findDatabaseByName(userId, 'Tasks');
if (db) {
  const record = await addRecordToDatabase(userId, db.id, {
    'Title': 'New Task',
    'Status': 'To Do',
    'Due Date': '2024-12-31'
  });
}
```

### AI Tool Usage

```typescript
import { createNotionTools } from '@/lib/notion/tools';

const tools = createNotionTools(userId);

// Search for content
const result = await tools.searchNotion.execute({
  query: 'project roadmap',
  type: 'page'
});

// Create a page
const page = await tools.createNotionPage.execute({
  title: 'Meeting Notes',
  content: 'Discussion points...',
  icon: '📝'
});

// Query a database
const tasks = await tools.queryNotionDatabase.execute({
  databaseId: 'abc123',
  filter: {
    property: 'Status',
    select: { equals: 'In Progress' }
  }
});
```

### Smart Assistant

```typescript
import { createSmartNotionAssistant } from '@/lib/notion/wrappedTools';

const assistant = createSmartNotionAssistant(userId);

// Natural language requests
const result = await assistant.execute({
  request: 'Add a meeting note called "Q4 Planning" to my Notes database',
  context: {
    contentType: 'meeting',
    dateContext: new Date().toISOString()
  }
});
```

## Block Builders

Create rich content easily:

```typescript
const blocks = [
  BlockBuilders.heading1('Title'),
  BlockBuilders.paragraph('Text with **bold** and *italic*'),
  BlockBuilders.bulletedListItem('Point 1'),
  BlockBuilders.bulletedListItem('Point 2'),
  BlockBuilders.todo('Task item', false),
  BlockBuilders.code('console.log("Hello");', 'javascript'),
  BlockBuilders.quote('Important quote'),
  BlockBuilders.divider(),
  BlockBuilders.image('url', 'Caption'),
  BlockBuilders.bookmark('https://example.com')
];
```

## Filter & Sort Builders

Query databases efficiently:

```typescript
import { FilterBuilders, SortBuilders } from '@/lib/notion/core';

// Complex filters
const filter = FilterBuilders.and(
  FilterBuilders.selectEquals('Status', 'Active'),
  FilterBuilders.dateAfter('Due Date', '2024-01-01'),
  FilterBuilders.or(
    FilterBuilders.richTextContains('Title', 'urgent'),
    FilterBuilders.checkbox('Priority', true)
  )
);

// Sorting
const sorts = [
  SortBuilders.property('Due Date', 'ascending'),
  SortBuilders.lastEdited('descending')
];
```

## Error Handling

All tools return structured responses:

```typescript
{
  success: boolean,
  // On success:
  data: any,
  message: string,
  
  // On error:
  error: string,
  suggestion: string
}
```

## Authentication

The integration uses Pipedream for OAuth authentication. Users must:
1. Connect their Notion account through Pipedream
2. Grant necessary permissions
3. The integration automatically handles API tokens

## Best Practices

1. **Use Smart Tools**: For AI agents, prefer the wrapped tools over core functions
2. **Handle Pagination**: Large queries return paginated results
3. **Check Permissions**: Ensure the integration has access to target pages/databases
4. **Format Properties**: Use `createPropertyValue` helper for correct formatting
5. **Error Recovery**: All tools include suggestions for error recovery

## Limitations

- Maximum 100 items per page in queries
- Some block types are read-only via API
- Rate limits apply (check Notion API docs)
- Not all Notion features are available via API