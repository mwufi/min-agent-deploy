/**
 * Example usage of the Notion integration
 * These examples demonstrate how to use the core functions and AI tools
 */

import {
    getPageContent,
    createPageWithContent,
    findDatabaseByName,
    addRecordToDatabase,
    queryDatabase,
    BlockBuilders,
    FilterBuilders,
    SortBuilders
} from './core';

// Example 1: Fetch a user's sub-pages
async function fetchSubPagesExample(userId: string, pageId: string) {
    const { getSubPages } = await import('./core/pages');
    
    const subPages = await getSubPages(userId, pageId);
    console.log(`Found ${subPages.length} sub-pages`);
    
    for (const page of subPages) {
        console.log(`- ${page.id}: ${page.properties}`);
    }
}

// Example 2: Get page content as markdown
async function getPageContentExample(userId: string, pageId: string) {
    const markdown = await getPageContent(userId, pageId, 'markdown');
    console.log('Page content as markdown:', markdown);
}

// Example 3: Create a new page with an image
async function createPageWithImageExample(userId: string) {
    const content = [
        BlockBuilders.heading1('My New Image'),
        BlockBuilders.paragraph('This is a page with an image:'),
        BlockBuilders.image(
            'https://example.com/image.jpg',
            'This is my new image'
        ),
        BlockBuilders.paragraph('Pretty cool, right?')
    ];

    const page = await createPageWithContent(userId, {
        title: 'This is my new image',
        parent: { type: 'workspace' },
        content
    });

    console.log('Created page:', page.url);
}

// Example 4: Working with databases
async function databaseExample(userId: string) {
    // Find a database by name
    const db = await findDatabaseByName(userId, 'Notes');
    
    if (!db) {
        console.log('Database not found');
        return;
    }

    // Get the database schema
    const { getDatabaseSchema } = await import('./core/databases');
    const schema = await getDatabaseSchema(userId, db.id);
    console.log('Database schema:', schema);

    // Add a record to the database
    const result = await addRecordToDatabase(userId, db.id, {
        'Title': 'Hello from API',
        'Date': new Date().toISOString(),
        'Tags': ['api', 'test'],
        'Status': 'In Progress'
    });

    console.log('Added record:', result.id);

    // Query the database with filters
    const queryResult = await queryDatabase(userId, db.id, {
        filter: FilterBuilders.and(
            FilterBuilders.richTextContains('Title', 'Hello'),
            FilterBuilders.dateAfter('Date', '2024-01-01')
        ),
        sorts: [
            SortBuilders.lastEdited('descending')
        ]
    });

    console.log(`Found ${queryResult.results.length} matching records`);
}

// Example 5: Complex content creation
async function createComplexPageExample(userId: string) {
    const content = [
        BlockBuilders.heading1('Project Documentation'),
        BlockBuilders.paragraph('This is a comprehensive project guide.'),
        
        BlockBuilders.heading2('Overview'),
        BlockBuilders.paragraph('Our project aims to...'),
        
        BlockBuilders.heading2('Features'),
        BlockBuilders.bulletedListItem('Feature 1: Authentication'),
        BlockBuilders.bulletedListItem('Feature 2: Data Management'),
        BlockBuilders.bulletedListItem('Feature 3: Reporting'),
        
        BlockBuilders.heading2('Technical Stack'),
        BlockBuilders.code(`
const tech = {
    frontend: 'Next.js',
    backend: 'Node.js',
    database: 'PostgreSQL'
};
        `, 'javascript'),
        
        BlockBuilders.heading2('Tasks'),
        BlockBuilders.todo('Complete API design', false),
        BlockBuilders.todo('Set up CI/CD', true),
        BlockBuilders.todo('Write tests', false),
        
        BlockBuilders.divider(),
        
        BlockBuilders.quote('Quality is not an act, it is a habit. - Aristotle'),
        
        BlockBuilders.heading2('Resources'),
        BlockBuilders.bookmark('https://nextjs.org', 'Next.js Documentation'),
        
        BlockBuilders.tableOfContents()
    ];

    const page = await createPageWithContent(userId, {
        title: 'Project Documentation',
        parent: { type: 'workspace' },
        content,
        icon: '📚',
        cover: 'https://example.com/cover.jpg'
    });

    console.log('Created complex page:', page.url);
}

// Example 6: Using the AI tools
async function aiToolsExample(userId: string) {
    const { createNotionTools } = await import('./tools');
    const tools = createNotionTools(userId);

    // Search for content
    const searchResult = await tools.searchNotion.execute({
        query: 'project roadmap',
        type: 'page'
    });

    if (searchResult.success && searchResult.results.length > 0) {
        // Get content of the first result
        const pageContent = await tools.getNotionPageContent.execute({
            pageId: searchResult.results[0].id,
            format: 'markdown'
        });

        console.log('Page content:', pageContent.content);
    }

    // Find and query a database
    const dbResult = await tools.findNotionDatabase.execute({
        name: 'Tasks'
    });

    if (dbResult.success) {
        // Query with filters
        const queryResult = await tools.queryNotionDatabase.execute({
            databaseId: dbResult.database.id,
            filter: {
                and: [
                    { property: 'Status', select: { equals: 'In Progress' } },
                    { property: 'Priority', select: { equals: 'High' } }
                ]
            },
            sorts: [{ property: 'Due Date', direction: 'ascending' }],
            limit: 10
        });

        console.log(`Found ${queryResult.results?.length || 0} high-priority tasks`);
    }
}

// Export examples for reference
export {
    fetchSubPagesExample,
    getPageContentExample,
    createPageWithImageExample,
    databaseExample,
    createComplexPageExample,
    aiToolsExample
};