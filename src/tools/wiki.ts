import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { redmineClient } from '../client/index.js';
import { formatWikiPage } from '../utils/formatters.js';
import { formatErrorResponse } from '../utils/errors.js';
import { validateInput, wikiPageSchema } from '../utils/validators.js';

// List wiki pages tool
export const listWikiPagesTool: Tool = {
  name: 'redmine_list_wiki_pages',
  description: 'List all wiki pages for a project',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: { 
        type: 'string', 
        description: 'Project ID or identifier' 
      }
    },
    required: ['project_id']
  }
};

export async function listWikiPages(input: unknown) {
  try {
    const { project_id } = input as { project_id: string };
    
    const response = await redmineClient.listWikiPages(project_id);
    const pages = response.wiki_pages || [];
    
    let content = `Found ${pages.length} wiki page(s) in project\n\n`;
    
    if (pages.length > 0) {
      // Group pages by parent
      const rootPages = pages.filter(p => !p.parent);
      const childPages = pages.filter(p => p.parent);
      
      content += 'Wiki Pages:\n';
      
      // Display root pages and their children
      rootPages.forEach(page => {
        content += `\n- ${page.title}`;
        if (page.version) {
          content += ` (v${page.version})`;
        }
        content += '\n';
        
        // Find children of this page
        const children = childPages.filter(c => c.parent?.title === page.title);
        children.forEach(child => {
          content += `  - ${child.title}`;
          if (child.version) {
            content += ` (v${child.version})`;
          }
          content += '\n';
        });
      });
      
      // Display any orphaned children
      const orphans = childPages.filter(c => 
        !rootPages.some(p => p.title === c.parent?.title)
      );
      if (orphans.length > 0) {
        content += '\nOrphaned pages:\n';
        orphans.forEach(page => {
          content += `- ${page.title} (parent: ${page.parent?.title})\n`;
        });
      }
    } else {
      content += 'No wiki pages found for this project.';
    }
    
    return {
      content: [{ type: 'text', text: content }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true
    };
  }
}

// Get wiki page tool
export const getWikiPageTool: Tool = {
  name: 'redmine_get_wiki_page',
  description: 'Get content of a specific wiki page',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: { 
        type: 'string', 
        description: 'Project ID or identifier' 
      },
      title: { 
        type: 'string', 
        description: 'Wiki page title' 
      },
      version: { 
        type: 'number', 
        description: 'Specific version number (optional)' 
      }
    },
    required: ['project_id', 'title']
  }
};

export async function getWikiPage(input: unknown) {
  try {
    const { project_id, title, version } = input as { 
      project_id: string; 
      title: string; 
      version?: number;
    };
    
    const response = await redmineClient.getWikiPage(project_id, title, version);
    const content = formatWikiPage(response.wiki_page);
    
    return {
      content: [{ type: 'text', text: content }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true
    };
  }
}

// Create or update wiki page tool
export const createOrUpdateWikiPageTool: Tool = {
  name: 'redmine_create_or_update_wiki_page',
  description: 'Create a new wiki page or update existing one',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: { 
        type: 'string', 
        description: 'Project ID or identifier' 
      },
      title: { 
        type: 'string', 
        description: 'Wiki page title' 
      },
      text: { 
        type: 'string', 
        description: 'Wiki page content (in Markdown format)' 
      },
      comments: { 
        type: 'string', 
        description: 'Comments about this change' 
      },
      parent_title: { 
        type: 'string', 
        description: 'Parent page title (for creating sub-pages)' 
      }
    },
    required: ['project_id', 'title', 'text']
  }
};

export async function createOrUpdateWikiPage(input: unknown) {
  try {
    const { project_id, title, ...pageData } = input as { project_id: string; title: string; [key: string]: unknown };
    const validatedData = validateInput(wikiPageSchema, pageData);
    
    await redmineClient.createOrUpdateWikiPage(project_id, title, validatedData);
    
    // Fetch the page to show current state
    const response = await redmineClient.getWikiPage(project_id, title);
    const content = `Wiki page saved successfully!\n\n${formatWikiPage(response.wiki_page)}`;
    
    return {
      content: [{ type: 'text', text: content }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true
    };
  }
}

// Delete wiki page tool
export const deleteWikiPageTool: Tool = {
  name: 'redmine_delete_wiki_page',
  description: 'Delete a wiki page',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: { 
        type: 'string', 
        description: 'Project ID or identifier' 
      },
      title: { 
        type: 'string', 
        description: 'Wiki page title to delete' 
      }
    },
    required: ['project_id', 'title']
  }
};

export async function deleteWikiPage(input: unknown) {
  try {
    const { project_id, title } = input as { project_id: string; title: string };
    
    await redmineClient.deleteWikiPage(project_id, title);
    
    return {
      content: [{ 
        type: 'text', 
        text: `Wiki page "${title}" deleted successfully from project.` 
      }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true
    };
  }
}