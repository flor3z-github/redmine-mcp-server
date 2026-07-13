# Redmine MCP Server API Documentation

This document provides detailed information about all available tools in the Redmine MCP Server.

## Table of Contents

1. [Issue Management Tools](#issue-management-tools)
2. [Project Management Tools](#project-management-tools)
3. [User Management Tools](#user-management-tools)
4. [Time Tracking Tools](#time-tracking-tools)
5. [Wiki Management Tools](#wiki-management-tools)
6. [Utility Tools](#utility-tools)
7. [Error Handling](#error-handling)

## Issue Management Tools

### redmine_list_issues

Lists issues with optional filters.

**Parameters:**
- `project_id` (string, optional): Project ID or identifier
- `status_id` (string, optional): Status ID, "open", "closed", or "*" for all
- `assigned_to_id` (string, optional): User ID, "me" for current user, or group ID
- `tracker_id` (number, optional): Tracker ID (Bug, Feature, etc.)
- `subject` (string, optional): Filter by subject (partial match)
- `created_on` (string, optional): Created date filter (e.g., "><2024-01-01|2024-12-31")
- `updated_on` (string, optional): Updated date filter
- `sort` (string, optional): Sort order (e.g., "priority:desc,updated_on:desc")
- `limit` (number, optional): Maximum results (1-100, default: 25)
- `offset` (number, optional): Number of issues to skip

**Example:**
```json
{
  "project_id": "my-project",
  "status_id": "open",
  "assigned_to_id": "me",
  "limit": 50
}
```

### redmine_get_issue

Gets detailed information about a specific issue.

**Parameters:**
- `id` (number, required): Issue ID
- `include` (array, optional): Additional data to include
  - `"journals"`: Issue history and comments
  - `"watchers"`: Users watching the issue
  - `"relations"`: Related issues
  - `"children"`: Sub-tasks
  - `"attachments"`: File attachments
  - `"changesets"`: Associated commits

**Example:**
```json
{
  "id": 123,
  "include": ["journals", "attachments"]
}
```

### redmine_create_issue

Creates a new issue.

**Parameters:**
- `project_id` (number, required): Project ID
- `subject` (string, required): Issue title
- `description` (string, optional): Issue description
- `tracker_id` (number, optional): Tracker ID
- `status_id` (number, optional): Initial status ID
- `priority_id` (number, optional): Priority ID
- `assigned_to_id` (number, optional): Assignee user ID
- `category_id` (number, optional): Category ID
- `fixed_version_id` (number, optional): Target version ID
- `parent_issue_id` (number, optional): Parent issue ID for sub-tasks
- `start_date` (string, optional): Start date (YYYY-MM-DD)
- `due_date` (string, optional): Due date (YYYY-MM-DD)
- `estimated_hours` (number, optional): Estimated hours
- `done_ratio` (number, optional): Completion percentage (0-100)
- `is_private` (boolean, optional): Private issue flag
- `watcher_user_ids` (array, optional): User IDs to add as watchers
- `custom_field_values` (object, optional): Custom field values

**Example:**
```json
{
  "project_id": 1,
  "subject": "Fix login bug",
  "description": "Users unable to login with special characters",
  "tracker_id": 1,
  "priority_id": 4,
  "assigned_to_id": 5
}
```

### redmine_update_issue

Updates an existing issue.

**Parameters:**
- `id` (number, required): Issue ID to update
- `notes` (string, optional): Update comment
- `private_notes` (boolean, optional): Make notes private
- All other parameters from `create_issue` are available

**Example:**
```json
{
  "id": 123,
  "status_id": 3,
  "done_ratio": 50,
  "notes": "Started implementation"
}
```

### redmine_delete_issue

Deletes an issue.

**Parameters:**
- `id` (number, required): Issue ID to delete

## Project Management Tools

### redmine_list_projects

Lists all available projects.

**Parameters:**
- `limit` (number, optional): Maximum results (1-100, default: 25)
- `offset` (number, optional): Number of projects to skip

### redmine_get_project

Gets detailed project information.

**Parameters:**
- `id` (string, required): Project ID or identifier
- `include` (array, optional): Additional data to include
  - `"trackers"`: Available trackers
  - `"issue_categories"`: Issue categories
  - `"enabled_modules"`: Enabled modules
  - `"time_entry_activities"`: Time entry activities

**Example:**
```json
{
  "id": "my-project",
  "include": ["trackers", "issue_categories"]
}
```

### redmine_get_project_versions

Lists versions/milestones for a project.

**Parameters:**
- `project_id` (string, required): Project ID or identifier

## User Management Tools

### redmine_list_users

Lists users with optional filters.

**Parameters:**
- `name` (string, optional): Filter by name (searches first name, last name, and login)
- `group_id` (number, optional): Filter by group membership
- `limit` (number, optional): Maximum results (1-100, default: 25)
- `offset` (number, optional): Number of users to skip

### redmine_get_current_user

Gets information about the currently authenticated user.

**Parameters:** None

### redmine_get_user

Gets detailed user information.

**Parameters:**
- `id` (number, required): User ID
- `include` (array, optional): Additional data
  - `"memberships"`: Project memberships and roles
  - `"groups"`: Group memberships

## Time Tracking Tools

### redmine_list_time_entries

Lists time entries with filters.

**Parameters:**
- `project_id` (string, optional): Project ID or identifier
- `issue_id` (number, optional): Issue ID
- `user_id` (string, optional): User ID or "me"
- `spent_on` (string, optional): Specific date (YYYY-MM-DD)
- `from` (string, optional): Start date for range
- `to` (string, optional): End date for range
- `activity_id` (number, optional): Activity type ID
- `limit` (number, optional): Maximum results
- `offset` (number, optional): Skip entries

**Example:**
```json
{
  "user_id": "me",
  "from": "2024-01-01",
  "to": "2024-01-31"
}
```

### redmine_get_time_entry

Gets specific time entry details.

**Parameters:**
- `id` (number, required): Time entry ID

### redmine_create_time_entry

Creates a new time entry.

**Parameters:**
- `hours` (number, required): Time spent in hours
- `activity_id` (number, required): Activity type ID
- `issue_id` (number, optional*): Issue ID
- `project_id` (number, optional*): Project ID
- `spent_on` (string, optional): Date (YYYY-MM-DD, defaults to today)
- `comments` (string, optional): Work description
- `user_id` (number, optional): User ID (admin only)
- `custom_field_values` (object, optional): Custom fields

*Note: Either `issue_id` or `project_id` is required

**Example:**
```json
{
  "issue_id": 123,
  "hours": 2.5,
  "activity_id": 9,
  "comments": "Implemented user authentication"
}
```

### redmine_update_time_entry

Updates an existing time entry.

**Parameters:**
- `id` (number, required): Time entry ID
- All other parameters from `create_time_entry`

### redmine_delete_time_entry

Deletes a time entry.

**Parameters:**
- `id` (number, required): Time entry ID

### redmine_list_time_entry_activities

Lists available time entry activity types.

**Parameters:** None

## Wiki Management Tools

### redmine_list_wiki_pages

Lists all wiki pages in a project.

**Parameters:**
- `project_id` (string, required): Project ID or identifier

### redmine_get_wiki_page

Gets wiki page content.

**Parameters:**
- `project_id` (string, required): Project ID or identifier
- `title` (string, required): Wiki page title
- `version` (number, optional): Specific version number

### redmine_create_or_update_wiki_page

Creates or updates a wiki page.

**Parameters:**
- `project_id` (string, required): Project ID or identifier
- `title` (string, required): Page title
- `text` (string, required): Page content (Textile/Markdown)
- `comments` (string, optional): Change comments
- `parent_title` (string, optional): Parent page for sub-pages

**Example:**
```json
{
  "project_id": "docs",
  "title": "API Documentation",
  "text": "# API Documentation\n\n## Overview...",
  "comments": "Initial documentation"
}
```

### redmine_delete_wiki_page

Deletes a wiki page.

**Parameters:**
- `project_id` (string, required): Project ID or identifier
- `title` (string, required): Page title to delete

## Utility Tools

### redmine_list_statuses

Lists all available issue statuses.

**Parameters:** None

**Response includes:**
- Status ID
- Name
- Whether it's a closed status
- Whether it's the default status

### redmine_list_priorities

Lists all available issue priorities.

**Parameters:** None

**Response includes:**
- Priority ID
- Name
- Whether it's the default priority
- Whether it's active

### redmine_list_trackers

Lists all available issue trackers (types).

**Parameters:** None

**Response includes:**
- Tracker ID
- Name
- Description

### redmine_custom_request

Makes a custom API request for advanced use cases.

**Parameters:**
- `method` (string, required): HTTP method (GET, POST, PUT, DELETE)
- `path` (string, required): API endpoint path (e.g., "/issues.json")
- `data` (object, optional): Request body for POST/PUT
- `params` (object, optional): Query parameters for GET

`path` must be a Redmine API relative path. Absolute URLs, protocol-relative URLs, parent directory segments, query strings, and hashes are rejected. Use `params` for query parameters.

**Example:**
```json
{
  "method": "GET",
  "path": "/projects/1/memberships.json",
  "params": {
    "limit": 100
  }
}
```

### redmine_search

Performs a full-text search across issues, wiki pages, projects, and more.

**Parameters:**
- `q` (string, required): Query string (space-separated for multiple keywords)
- `offset` (number, optional): Number of results to skip
- `limit` (number, optional): Number of results to return
- `scope` (string, optional): Search scope (`all`, `my_project`, `subprojects`)
- `all_words` (boolean, optional): Match all query words
- `titles_only` (boolean, optional): Match only in titles
- `issues` (boolean, optional): Include issues in search
- `news` (boolean, optional): Include news in search
- `documents` (boolean, optional): Include documents in search
- `changesets` (boolean, optional): Include changesets in search
- `wiki_pages` (boolean, optional): Include wiki pages in search
- `messages` (boolean, optional): Include messages in search
- `projects` (boolean, optional): Include projects in search
- `open_issues` (boolean, optional): Filter by open issues
- `attachments` (string, optional): Search in description/attachment (`0`, `1`, `only`)

**Example:**
```json
{
  "q": "login bug",
  "issues": true,
  "wiki_pages": true,
  "limit": 10
}
```

Returns a list of matching results with type, title, URL, description, and date.

## Error Handling

All tools return errors in a consistent format:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Error: Description of what went wrong"
    }
  ],
  "isError": true
}
```

### Common Error Types

1. **Configuration Errors**
   - Missing or invalid Redmine URL
   - Missing authentication credentials

2. **Authentication Errors**
   - Invalid API key
   - Incorrect username/password
   - Insufficient permissions

3. **Validation Errors**
   - Missing required parameters
   - Invalid parameter formats
   - Invalid date formats (must be YYYY-MM-DD)

4. **API Errors**
   - Resource not found (404)
   - Forbidden access (403)
   - Server errors (500)

5. **Network Errors**
   - Connection timeout
   - Unable to reach server
   - SSL/TLS issues

## Best Practices

1. **Authentication**
   - Use API keys instead of username/password when possible
   - Create dedicated API keys with minimal required permissions

2. **Filtering**
   - Use specific filters to reduce response size
   - Combine filters for precise results

3. **Pagination**
   - Use `limit` and `offset` for large result sets
   - Default limit is 25, maximum is 100

4. **Performance**
   - Request only needed `include` parameters
   - Cache frequently accessed data
   - Use bulk operations when available

5. **Error Handling**
   - Always handle potential errors gracefully
   - Check permissions before attempting operations
   - Validate input before making requests
