import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { redmineClient } from '../client/index.js';
import { formatErrorResponse } from '../utils/errors.js';

// Import all tools
import {
  listIssuesTool,
  getIssueTool,
  createIssueTool,
  updateIssueTool,
  deleteIssueTool,
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  deleteIssue,
} from './issues.js';

import {
  listProjectsTool,
  getProjectTool,
  getProjectVersionsTool,
  listProjects,
  getProject,
  getProjectVersions,
} from './projects.js';

import {
  listUsersTool,
  getCurrentUserTool,
  getUserTool,
  listUsers,
  getCurrentUser,
  getUser,
} from './users.js';

import {
  listTimeEntriesTool,
  getTimeEntryTool,
  createTimeEntryTool,
  updateTimeEntryTool,
  deleteTimeEntryTool,
  listTimeEntryActivitiesTool,
  listTimeEntries,
  getTimeEntry,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  listTimeEntryActivities,
} from './time-entries.js';

import {
  listWikiPagesTool,
  getWikiPageTool,
  createOrUpdateWikiPageTool,
  deleteWikiPageTool,
  listWikiPages,
  getWikiPage,
  createOrUpdateWikiPage,
  deleteWikiPage,
} from './wiki.js';

import {
  updateJournalTool,
  updateJournal,
} from './journals.js';

import {
  getAttachmentTool,
  updateAttachmentTool,
  deleteAttachmentTool,
  getAttachment,
  updateAttachment,
  deleteAttachment,
} from './attachments.js';

import {
  listFilesTool,
  createFileTool,
  uploadFileTool,
  listFiles,
  createFile,
  uploadFile,
} from './files.js';

// Add custom API request tool
export const customRequestTool: Tool = {
  name: 'redmine_custom_request',
  description: 'Make a custom API request to Redmine',
  inputSchema: {
    type: 'object',
    properties: {
      method: {
        type: 'string',
        enum: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'HTTP method'
      },
      path: {
        type: 'string',
        description: 'API path (e.g., "/issues.json")'
      },
      data: {
        type: 'object',
        description: 'Request body data (for POST/PUT)'
      },
      params: {
        type: 'object',
        description: 'Query parameters (for GET)'
      }
    },
    required: ['method', 'path']
  }
};

export async function customRequest(input: unknown) {
  try {
    const { method, path, data, params } = input as {
      method: string;
      path: string;
      data?: unknown;
      params?: unknown;
    };
    
    const response = await redmineClient.customRequest(method, path, data, params as Record<string, unknown>);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(response, null, 2)
      }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true
    };
  }
}

// Helper tools
export const listStatusesTool: Tool = {
  name: 'redmine_list_statuses',
  description: 'List all available issue statuses',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function listStatuses() {
  try {
    const response = await redmineClient.listIssueStatuses();
    const statuses = response.issue_statuses || [];
    
    let content = 'Available Issue Statuses:\n\n';
    statuses.forEach(status => {
      content += `- ${status.name} (ID: ${status.id})`;
      if (status.is_closed) {
        content += ' [CLOSED]';
      }
      if (status.is_default) {
        content += ' [DEFAULT]';
      }
      content += '\n';
    });
    
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

export const listPrioritiesTool: Tool = {
  name: 'redmine_list_priorities',
  description: 'List all available issue priorities',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function listPriorities() {
  try {
    const response = await redmineClient.listIssuePriorities();
    const priorities = response.issue_priorities || [];
    
    let content = 'Available Issue Priorities:\n\n';
    priorities.forEach(priority => {
      content += `- ${priority.name} (ID: ${priority.id})`;
      if (priority.is_default) {
        content += ' [DEFAULT]';
      }
      if (priority.active === false) {
        content += ' [INACTIVE]';
      }
      content += '\n';
    });
    
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

export const listTrackersTool: Tool = {
  name: 'redmine_list_trackers',
  description: 'List all available issue trackers',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function listTrackers() {
  try {
    const response = await redmineClient.listTrackers();
    const trackers = response.trackers || [];
    
    let content = 'Available Issue Trackers:\n\n';
    trackers.forEach(tracker => {
      content += `- ${tracker.name} (ID: ${tracker.id})`;
      if (tracker.description) {
        content += `\n  Description: ${tracker.description}`;
      }
      content += '\n';
    });
    
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

// Search tool
export const searchTool: Tool = {
  name: 'redmine_search',
  description: 'Search Redmine for issues, wiki pages, and more',
  inputSchema: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Query string (space-separated for multiple keywords)' },
      offset: { type: 'number', description: 'Number of results to skip (optional)' },
      limit: { type: 'number', description: 'Number of results to return (optional)' },
      scope: { type: 'string', enum: ['all', 'my_project', 'subprojects'], description: 'Search scope (optional)' },
      all_words: { type: 'boolean', description: 'Match all query words (optional)' },
      titles_only: { type: 'boolean', description: 'Match only in titles (optional)' },
      issues: { type: 'boolean', description: 'Include issues in search (optional)' },
      news: { type: 'boolean', description: 'Include news in search (optional)' },
      documents: { type: 'boolean', description: 'Include documents in search (optional)' },
      changesets: { type: 'boolean', description: 'Include changesets in search (optional)' },
      wiki_pages: { type: 'boolean', description: 'Include wiki pages in search (optional)' },
      messages: { type: 'boolean', description: 'Include messages in search (optional)' },
      projects: { type: 'boolean', description: 'Include projects in search (optional)' },
      open_issues: { type: 'boolean', description: 'Filter by open issues (optional)' },
      attachments: { type: 'string', enum: ['0', '1', 'only'], description: 'Search in description/attachment (optional)' }
    },
    required: ['q']
  }
};

export async function searchRedmine(input: unknown) {
  try {
    const params: Record<string, unknown> = { ...(input as Record<string, unknown>) };
    const response = await redmineClient.customRequest('GET', '/search.json', undefined, params) as Record<string, unknown>;
    const results = (response.results as Array<Record<string, unknown>>) || [];
    const total = (response.total_count as number) || results.length;
    let content = `Found ${total} result(s) for "${params.q}"\n\n`;
    if (results.length > 0) {
      results.forEach((item: Record<string, unknown>, idx: number) => {
        content += `${idx + 1}. [${item.type}] ${item.title}\n   URL: ${item.url}\n   Description: ${typeof item.description === 'string' ? item.description.slice(0, 200) : ''}\n   Date: ${item.datetime}\n\n`;
      });
    } else {
      content += 'No results found.';
    }
    return { content: [{ type: 'text', text: content }] };
  } catch (error) {
    return { content: [{ type: 'text', text: formatErrorResponse(error) }], isError: true };
  }
}

// Export all tools
export const tools: Tool[] = [
  // Issue tools
  listIssuesTool,
  getIssueTool,
  createIssueTool,
  updateIssueTool,
  deleteIssueTool,
  
  // Project tools
  listProjectsTool,
  getProjectTool,
  getProjectVersionsTool,
  
  // User tools
  listUsersTool,
  getCurrentUserTool,
  getUserTool,
  
  // Time entry tools
  listTimeEntriesTool,
  getTimeEntryTool,
  createTimeEntryTool,
  updateTimeEntryTool,
  deleteTimeEntryTool,
  listTimeEntryActivitiesTool,
  
  // Wiki tools
  listWikiPagesTool,
  getWikiPageTool,
  createOrUpdateWikiPageTool,
  deleteWikiPageTool,

  // Journal tools
  updateJournalTool,

  // Attachment tools
  getAttachmentTool,
  updateAttachmentTool,
  deleteAttachmentTool,

  // File tools
  listFilesTool,
  createFileTool,
  uploadFileTool,

  // Custom request tool
  customRequestTool,

  // Helper tools
  listStatusesTool,
  listPrioritiesTool,
  listTrackersTool,

  // Search tool
  searchTool,
];

// Export tool handlers map
// eslint-disable-next-line no-unused-vars
export const toolHandlers: Record<string, (_input?: unknown) => Promise<unknown>> = {
  // Issue handlers
  redmine_list_issues: listIssues,
  redmine_get_issue: getIssue,
  redmine_create_issue: createIssue,
  redmine_update_issue: updateIssue,
  redmine_delete_issue: deleteIssue,
  
  // Project handlers
  redmine_list_projects: listProjects,
  redmine_get_project: getProject,
  redmine_get_project_versions: getProjectVersions,
  
  // User handlers
  redmine_list_users: listUsers,
  redmine_get_current_user: getCurrentUser,
  redmine_get_user: getUser,
  
  // Time entry handlers
  redmine_list_time_entries: listTimeEntries,
  redmine_get_time_entry: getTimeEntry,
  redmine_create_time_entry: createTimeEntry,
  redmine_update_time_entry: updateTimeEntry,
  redmine_delete_time_entry: deleteTimeEntry,
  redmine_list_time_entry_activities: listTimeEntryActivities,
  
  // Wiki handlers
  redmine_list_wiki_pages: listWikiPages,
  redmine_get_wiki_page: getWikiPage,
  redmine_create_or_update_wiki_page: createOrUpdateWikiPage,
  redmine_delete_wiki_page: deleteWikiPage,

  // Journal handlers
  redmine_update_journal: updateJournal,

  // Attachment handlers
  redmine_get_attachment: getAttachment,
  redmine_update_attachment: updateAttachment,
  redmine_delete_attachment: deleteAttachment,

  // File handlers
  redmine_list_files: listFiles,
  redmine_create_file: createFile,
  redmine_upload_file: uploadFile,

  // Custom request handler
  redmine_custom_request: customRequest,

  // Helper handlers
  redmine_list_statuses: listStatuses,
  redmine_list_priorities: listPriorities,
  redmine_list_trackers: listTrackers,

  // Search handler
  redmine_search: searchRedmine,
};