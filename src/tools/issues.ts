import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { redmineClient } from '../client/index.js';
import { formatIssue, formatList, truncateText } from '../utils/formatters.js';
import { formatErrorResponse } from '../utils/errors.js';
import {
  validateInput,
  parseId,
  createIssueSchema,
  updateIssueSchema,
  issueQuerySchema,
  getIssueSchema,
} from '../utils/validators.js';
import type { RedmineIssue } from '../client/types.js';
import type { z } from 'zod';

// List issues tool
export const listIssuesTool: Tool = {
  name: 'redmine_list_issues',
  description: 'List issues from Redmine with optional filters',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: { 
        type: 'string', 
        description: 'Project ID or identifier' 
      },
      status_id: { 
        type: 'string', 
        description: 'Status ID or "open"/"closed"/"*"' 
      },
      assigned_to_id: { 
        type: 'string', 
        description: 'User ID, "me", or group ID' 
      },
      tracker_id: { 
        type: 'number', 
        description: 'Tracker ID' 
      },
      subject: { 
        type: 'string', 
        description: 'Filter by subject (partial match)' 
      },
      created_on: { 
        type: 'string', 
        description: 'Created date filter (e.g., "><2024-01-01|2024-12-31")' 
      },
      updated_on: { 
        type: 'string', 
        description: 'Updated date filter' 
      },
      sort: { 
        type: 'string', 
        description: 'Sort order (e.g., "priority:desc,updated_on:desc")' 
      },
      limit: { 
        type: 'number', 
        description: 'Maximum number of issues to return (1-100, default: 25)' 
      },
      offset: { 
        type: 'number', 
        description: 'Number of issues to skip' 
      }
    }
  }
};

export async function listIssues(input: unknown) {
  try {
    const params = validateInput(issueQuerySchema, input);
    const response = await redmineClient.listIssues(params);
    
    const issues: RedmineIssue[] = Array.isArray(response.issues) ? response.issues : [];
    const total = response.total_count || issues.length;
    
    let content = `Found ${total} issue(s)`;
    if (params.offset && params.offset > 0) {
      content += ` (showing ${params.offset + 1}-${params.offset + issues.length})`;
    }
    content += '\n\n';
    
    if (issues.length > 0) {
      content += formatList(issues, (issue) => {
        const formatted = formatIssue(issue);
        // Truncate description for list view
        return formatted.replace(/\nDescription:\n.*/s, (match) => {
          const desc = match.replace(/\nDescription:\n/, '');
          return desc.length > 200 ? `\nDescription:\n${truncateText(desc, 200)}` : match;
        });
      });
    } else {
      content += 'No issues found matching the criteria.';
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

// Get issue tool
export const getIssueTool: Tool = {
  name: 'redmine_get_issue',
  description:
    'Get a specific issue. Comments (journals) are OFF by default to save tokens; ' +
    'the total count is always shown. Enable and page through comments with the journals_* params.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Issue ID',
      },
      include_journals: {
        type: 'boolean',
        description: 'Return comment bodies (default false). When false, only the total count is shown.',
      },
      journals_limit: {
        type: 'number',
        description: 'Max comments to return when include_journals=true (1-100, default 10)',
      },
      journals_offset: {
        type: 'number',
        description: 'Comment start index for paging (default 0; with desc order, 0 = newest)',
      },
      journals_order: {
        type: 'string',
        description: '"desc" (newest first, default) or "asc" (oldest first)',
      },
      description_max_chars: {
        type: 'number',
        description: 'Truncate the description to this many chars. Omit or 0 = full text.',
      },
      journal_notes_max_chars: {
        type: 'number',
        description: 'Truncate each comment to this many chars (default 500). 0 = full text.',
      },
      include: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Extra data besides journals: watchers, relations, children, attachments, changesets. ' +
          "Passing 'journals' here also turns comments on unless include_journals is explicitly set.",
      },
    },
    required: ['id'],
  },
};

function buildInclude(userInclude?: string[]): { include: string[]; journalsRequested: boolean } {
  const requested = userInclude ?? [];
  const journalsRequested = requested.includes('journals');
  const others = requested.filter((v) => v !== 'journals');
  return { include: ['journals', ...others], journalsRequested };
}

export async function getIssue(input: unknown) {
  try {
    const params = validateInput(getIssueSchema, input);
    const { include, journalsRequested } = buildInclude(params.include);
    const includeJournals = params.include_journals ?? journalsRequested;

    const response = await redmineClient.getIssue(params.id, include);
    const content = formatIssue(response.issue, {
      descriptionMaxChars: params.description_max_chars,
      includeJournals,
      journalsLimit: params.journals_limit,
      journalsOffset: params.journals_offset,
      journalsOrder: params.journals_order,
      journalNotesMaxChars: params.journal_notes_max_chars,
    });

    return {
      content: [{ type: 'text', text: content }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}

// Create issue tool
export const createIssueTool: Tool = {
  name: 'redmine_create_issue',
  description: 'Create a new issue in Redmine',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: { 
        type: 'number', 
        description: 'Project ID' 
      },
      subject: { 
        type: 'string', 
        description: 'Issue subject/title' 
      },
      description: { 
        type: 'string', 
        description: 'Issue description (in Markdown format)' 
      },
      tracker_id: { 
        type: 'number', 
        description: 'Tracker ID (e.g., Bug, Feature, Task)' 
      },
      status_id: { 
        type: 'number', 
        description: 'Status ID' 
      },
      priority_id: { 
        type: 'number', 
        description: 'Priority ID' 
      },
      assigned_to_id: { 
        type: 'number', 
        description: 'Assigned user ID' 
      },
      category_id: { 
        type: 'number', 
        description: 'Category ID' 
      },
      fixed_version_id: { 
        type: 'number', 
        description: 'Target version ID' 
      },
      parent_issue_id: { 
        type: 'number', 
        description: 'Parent issue ID' 
      },
      start_date: { 
        type: 'string', 
        description: 'Start date (YYYY-MM-DD)' 
      },
      due_date: { 
        type: 'string', 
        description: 'Due date (YYYY-MM-DD)' 
      },
      estimated_hours: { 
        type: 'number', 
        description: 'Estimated hours' 
      },
      done_ratio: { 
        type: 'number', 
        description: 'Completion percentage (0-100)' 
      },
      is_private: { 
        type: 'boolean', 
        description: 'Whether the issue is private' 
      },
      watcher_user_ids: {
        type: 'array',
        items: { type: 'number' },
        description: 'User IDs to add as watchers'
      },
      custom_field_values: {
        type: 'object',
        description: 'Custom field values as key-value pairs'
      },
      uploads: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Upload token from redmine_upload_file' },
            filename: { type: 'string', description: 'Filename' },
            description: { type: 'string', description: 'File description' },
            content_type: { type: 'string', description: 'MIME type' }
          },
          required: ['token']
        },
        description: 'File attachments to add (use redmine_upload_file first to get tokens)'
      }
    },
    required: ['project_id', 'subject']
  }
};

export async function createIssue(input: unknown) {
  try {
    const issueData = validateInput(createIssueSchema, input);
    
    // Transform the data to match Redmine API format
    const apiData: Record<string, unknown> = {
      project_id: issueData.project_id,
      subject: issueData.subject,
      description: issueData.description,
      tracker_id: issueData.tracker_id,
      status_id: issueData.status_id,
      priority_id: issueData.priority_id,
      assigned_to_id: issueData.assigned_to_id,
      category_id: issueData.category_id,
      fixed_version_id: issueData.fixed_version_id,
      parent_issue_id: issueData.parent_issue_id,
      start_date: issueData.start_date,
      due_date: issueData.due_date,
      estimated_hours: issueData.estimated_hours,
      done_ratio: issueData.done_ratio,
      is_private: issueData.is_private,
      watcher_user_ids: issueData.watcher_user_ids,
      custom_field_values: issueData.custom_field_values,
      uploads: issueData.uploads,
    };
    
    const response = await redmineClient.createIssue(apiData);
    const content = `Issue created successfully!\n\n${formatIssue(response.issue)}`;
    
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

// Update issue tool
export const updateIssueTool: Tool = {
  name: 'redmine_update_issue',
  description: 'Update an existing issue in Redmine',
  inputSchema: {
    type: 'object',
    properties: {
      id: { 
        type: 'number', 
        description: 'Issue ID to update' 
      },
      subject: { 
        type: 'string', 
        description: 'Issue subject/title' 
      },
      description: { 
        type: 'string', 
        description: 'Issue description (in Markdown format)'
      },
      notes: {
        type: 'string',
        description: 'Update notes/comment (in Markdown format)' 
      },
      private_notes: { 
        type: 'boolean', 
        description: 'Whether the notes are private' 
      },
      tracker_id: { 
        type: 'number', 
        description: 'Tracker ID' 
      },
      status_id: { 
        type: 'number', 
        description: 'Status ID' 
      },
      priority_id: { 
        type: 'number', 
        description: 'Priority ID' 
      },
      assigned_to_id: { 
        type: 'number', 
        description: 'Assigned user ID' 
      },
      category_id: { 
        type: 'number', 
        description: 'Category ID' 
      },
      fixed_version_id: { 
        type: 'number', 
        description: 'Target version ID' 
      },
      parent_issue_id: { 
        type: 'number', 
        description: 'Parent issue ID' 
      },
      start_date: { 
        type: 'string', 
        description: 'Start date (YYYY-MM-DD)' 
      },
      due_date: { 
        type: 'string', 
        description: 'Due date (YYYY-MM-DD)' 
      },
      estimated_hours: { 
        type: 'number', 
        description: 'Estimated hours' 
      },
      done_ratio: { 
        type: 'number', 
        description: 'Completion percentage (0-100)' 
      },
      is_private: { 
        type: 'boolean', 
        description: 'Whether the issue is private' 
      },
      custom_field_values: {
        type: 'object',
        description: 'Custom field values as key-value pairs'
      },
      uploads: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            token: { type: 'string', description: 'Upload token from redmine_upload_file' },
            filename: { type: 'string', description: 'Filename' },
            description: { type: 'string', description: 'File description' },
            content_type: { type: 'string', description: 'MIME type' }
          },
          required: ['token']
        },
        description: 'File attachments to add (use redmine_upload_file first to get tokens)'
      }
    },
    required: ['id']
  }
};

export async function updateIssue(input: unknown) {
  try {
    const { id, ...updateData } = input as { id: number; [key: string]: unknown };
    const issueId = parseId(id);
    const validatedData = validateInput(updateIssueSchema, updateData);
    
    await redmineClient.updateIssue(issueId, validatedData as z.infer<typeof updateIssueSchema>);
    
    // Fetch updated issue to show current state
    const response = await redmineClient.getIssue(issueId);
    const content = `Issue updated successfully!\n\n${formatIssue(response.issue)}`;
    
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

// Delete issue tool
export const deleteIssueTool: Tool = {
  name: 'redmine_delete_issue',
  description: 'Delete an issue from Redmine',
  inputSchema: {
    type: 'object',
    properties: {
      id: { 
        type: 'number', 
        description: 'Issue ID to delete' 
      }
    },
    required: ['id']
  }
};

export async function deleteIssue(input: unknown) {
  try {
    const { id } = input as { id: number };
    const issueId = parseId(id);
    
    await redmineClient.deleteIssue(issueId);
    
    return {
      content: [{ type: 'text', text: `Issue #${issueId} deleted successfully.` }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true
    };
  }
}