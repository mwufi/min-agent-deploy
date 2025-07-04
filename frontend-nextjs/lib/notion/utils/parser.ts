import { NotionBlock } from '../client';

// Convert Notion rich text to plain text
export function richTextToPlainText(richTextArray: any[]): string {
    if (!richTextArray || !Array.isArray(richTextArray)) return '';
    return richTextArray.map(item => item.plain_text || '').join('');
}

// Convert Notion rich text to markdown
export function richTextToMarkdown(richTextArray: any[]): string {
    if (!richTextArray || !Array.isArray(richTextArray)) return '';
    
    return richTextArray.map(item => {
        let text = item.plain_text || '';
        const annotations = item.annotations || {};
        
        // Apply markdown formatting based on annotations
        if (annotations.bold) text = `**${text}**`;
        if (annotations.italic) text = `*${text}*`;
        if (annotations.strikethrough) text = `~~${text}~~`;
        if (annotations.underline) text = `<u>${text}</u>`;
        if (annotations.code) text = `\`${text}\``;
        
        // Handle links
        if (item.href) text = `[${text}](${item.href})`;
        
        return text;
    }).join('');
}

// Convert a single Notion block to markdown
export function blockToMarkdown(block: NotionBlock): string {
    const type = block.type;
    const content = block[type];
    
    if (!content) return '';
    
    switch (type) {
        case 'paragraph':
            return richTextToMarkdown(content.rich_text) + '\n\n';
            
        case 'heading_1':
            return `# ${richTextToMarkdown(content.rich_text)}\n\n`;
            
        case 'heading_2':
            return `## ${richTextToMarkdown(content.rich_text)}\n\n`;
            
        case 'heading_3':
            return `### ${richTextToMarkdown(content.rich_text)}\n\n`;
            
        case 'bulleted_list_item':
            return `- ${richTextToMarkdown(content.rich_text)}\n`;
            
        case 'numbered_list_item':
            return `1. ${richTextToMarkdown(content.rich_text)}\n`;
            
        case 'to_do':
            const checked = content.checked ? '[x]' : '[ ]';
            return `- ${checked} ${richTextToMarkdown(content.rich_text)}\n`;
            
        case 'toggle':
            return `<details>\n<summary>${richTextToMarkdown(content.rich_text)}</summary>\n\n`;
            
        case 'code':
            const language = content.language || '';
            const code = richTextToPlainText(content.rich_text);
            return `\`\`\`${language}\n${code}\n\`\`\`\n\n`;
            
        case 'quote':
            return `> ${richTextToMarkdown(content.rich_text)}\n\n`;
            
        case 'divider':
            return '---\n\n';
            
        case 'image':
            const imageUrl = content.type === 'external' ? content.external.url : content.file.url;
            const caption = content.caption ? richTextToMarkdown(content.caption) : '';
            return `![${caption}](${imageUrl})\n\n`;
            
        case 'video':
            const videoUrl = content.type === 'external' ? content.external.url : content.file.url;
            return `[Video](${videoUrl})\n\n`;
            
        case 'file':
            const fileUrl = content.type === 'external' ? content.external.url : content.file.url;
            const fileName = content.caption ? richTextToPlainText(content.caption) : 'File';
            return `[${fileName}](${fileUrl})\n\n`;
            
        case 'pdf':
            const pdfUrl = content.type === 'external' ? content.external.url : content.file.url;
            return `[PDF Document](${pdfUrl})\n\n`;
            
        case 'bookmark':
            const bookmarkCaption = content.caption ? richTextToMarkdown(content.caption) : content.url;
            return `[${bookmarkCaption}](${content.url})\n\n`;
            
        case 'equation':
            return `$${content.expression}$\n\n`;
            
        case 'table_of_contents':
            return '[Table of Contents]\n\n';
            
        case 'link_preview':
            return `[${content.url}](${content.url})\n\n`;
            
        case 'table':
            return '[Table - view in Notion]\n\n';
            
        case 'column_list':
            return '[Columns - view in Notion]\n\n';
            
        default:
            return `[${type} block - view in Notion]\n\n`;
    }
}

// Convert array of blocks to markdown
export function blocksToMarkdown(blocks: NotionBlock[]): string {
    return blocks.map(block => blockToMarkdown(block)).join('');
}

// Format property value based on type
export function formatPropertyValue(property: any): any {
    if (!property) return null;
    
    switch (property.type) {
        case 'title':
        case 'rich_text':
            return richTextToPlainText(property[property.type]);
            
        case 'number':
            return property.number;
            
        case 'select':
            return property.select?.name || null;
            
        case 'multi_select':
            return property.multi_select?.map((item: any) => item.name) || [];
            
        case 'date':
            return property.date;
            
        case 'checkbox':
            return property.checkbox;
            
        case 'url':
            return property.url;
            
        case 'email':
            return property.email;
            
        case 'phone_number':
            return property.phone_number;
            
        case 'formula':
            return property.formula;
            
        case 'relation':
            return property.relation?.map((item: any) => item.id) || [];
            
        case 'rollup':
            return property.rollup;
            
        case 'created_time':
            return property.created_time;
            
        case 'created_by':
            return property.created_by;
            
        case 'last_edited_time':
            return property.last_edited_time;
            
        case 'last_edited_by':
            return property.last_edited_by;
            
        case 'people':
            return property.people?.map((person: any) => person.id) || [];
            
        case 'files':
            return property.files?.map((file: any) => ({
                name: file.name,
                url: file.type === 'external' ? file.external.url : file.file.url
            })) || [];
            
        case 'status':
            return property.status?.name || null;
            
        default:
            return null;
    }
}

// Extract title from page properties
export function getPageTitle(properties: Record<string, any>): string {
    // Look for common title property names
    const titleKeys = ['title', 'Title', 'Name', 'name', 'Page', 'page'];
    
    for (const key of titleKeys) {
        if (properties[key] && properties[key].type === 'title') {
            return richTextToPlainText(properties[key].title);
        }
    }
    
    // If no title found, look for the first title-type property
    for (const [key, value] of Object.entries(properties)) {
        if (value.type === 'title') {
            return richTextToPlainText(value.title);
        }
    }
    
    return 'Untitled';
}

// Convert database properties to simplified format
export function simplifyDatabaseProperties(properties: Record<string, any>): Record<string, any> {
    const simplified: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(properties)) {
        simplified[key] = formatPropertyValue(value);
    }
    
    return simplified;
}

// Prepare rich text for Notion API
export function createRichText(text: string): any[] {
    return [{
        type: 'text',
        text: {
            content: text
        }
    }];
}

// Create a property value object for updating
export function createPropertyValue(type: string, value: any): any {
    switch (type) {
        case 'title':
        case 'rich_text':
            return {
                type,
                [type]: typeof value === 'string' ? createRichText(value) : value
            };
            
        case 'number':
            return { type, number: value };
            
        case 'select':
            return { type, select: { name: value } };
            
        case 'multi_select':
            return {
                type,
                multi_select: Array.isArray(value)
                    ? value.map(v => ({ name: v }))
                    : [{ name: value }]
            };
            
        case 'date':
            return {
                type,
                date: typeof value === 'string' ? { start: value } : value
            };
            
        case 'checkbox':
            return { type, checkbox: Boolean(value) };
            
        case 'url':
            return { type, url: value };
            
        case 'email':
            return { type, email: value };
            
        case 'phone_number':
            return { type, phone_number: value };
            
        case 'people':
            return {
                type,
                people: Array.isArray(value)
                    ? value.map(id => ({ id }))
                    : [{ id: value }]
            };
            
        case 'relation':
            return {
                type,
                relation: Array.isArray(value)
                    ? value.map(id => ({ id }))
                    : [{ id: value }]
            };
            
        case 'status':
            return { type, status: { name: value } };
            
        default:
            throw new Error(`Unsupported property type: ${type}`);
    }
}