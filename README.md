# Redmine MCP Server

[![npm version](https://img.shields.io/npm/v/@gmlee-ncurity/mcp-server-redmine.svg)](https://www.npmjs.com/package/@gmlee-ncurity/mcp-server-redmine)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/gmlee-ncurity/redmine-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/gmlee-ncurity/redmine-mcp-server/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server that enables AI assistants to interact with Redmine project management systems. This server provides comprehensive access to Redmine's features including issues, projects, time tracking, users, and wiki pages.

## Quick Start

```bash
# 1. Get your Redmine API key from: My account → API access key → Show

# 2. Add to Claude Desktop config (~/.config/Claude/claude_desktop_config.json):
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "@gmlee-ncurity/mcp-server-redmine"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "your-api-key"
      }
    }
  }
}

# 3. Restart Claude Desktop and start asking questions like:
#    "Show me all open issues assigned to me"
```

## Features

### Issue Management
- List, search, and filter issues
- Create, update, and delete issues
- View issue details with relationships and history

### Project Management
- List all projects
- View project details and metadata
- Access project versions/milestones

### Time Tracking
- Log time entries
- View and manage time records
- List time entry activities

### User Management
- List users and groups
- Get user details and memberships
- Access current user information

### Wiki Management
- List wiki pages with hierarchy
- Create, update, and delete wiki pages
- View wiki page history

### Utilities
- List issue statuses, priorities, and trackers
- Custom API requests for advanced use cases
- Search issues, wiki pages, and more

## Prerequisites

- Node.js >= 20.0.0
- A Redmine instance with API access enabled
- Redmine API key or username/password

## Installation

### Global Installation (recommended)

```bash
npm install -g @gmlee-ncurity/mcp-server-redmine
```

### Direct Usage (no installation required)

```bash
npx @gmlee-ncurity/mcp-server-redmine
```

### For local development

```bash
# Clone the repository
git clone https://github.com/gmlee-ncurity/redmine-mcp-server.git
cd redmine-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Environment Variables

Configure the server using environment variables in your MCP client configuration:

```bash
# Required
REDMINE_URL=https://your-redmine-instance.com
REDMINE_API_KEY=your-api-key-here

# Optional: Basic auth (if API key not used)
# REDMINE_USERNAME=your-username
# REDMINE_PASSWORD=your-password

# Optional: SSL configuration
# REDMINE_SSL_VERIFY=true
# REDMINE_CA_CERT=/path/to/ca.crt

# Optional: Request configuration
# REDMINE_REQUEST_TIMEOUT=30000
# REDMINE_MAX_RETRIES=3
```

### Getting a Redmine API Key

1. Log in to your Redmine instance
2. Go to "My account" (top right)
3. Click on "API access key" in the sidebar
4. Click "Show" to reveal your API key
5. Use the API key in your MCP configuration

## Usage with Claude Desktop

### Using the published package

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "@gmlee-ncurity/mcp-server-redmine"],
      "env": {
        "REDMINE_URL": "https://your-redmine-instance.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Using local development version

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["/path/to/redmine-mcp-server/dist/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine-instance.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Usage with VS Code

You can use this MCP server with VS Code extensions that support the Model Context Protocol. Here's how to configure it:

### Using Cline (Claude Dev) extension

1. Install the Cline extension from VS Code marketplace
2. Open VS Code settings (Cmd/Ctrl + ,)
3. Search for "Cline MCP"
4. Add the Redmine server configuration:

```json
{
  "cline.mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "@gmlee-ncurity/mcp-server-redmine"],
      "env": {
        "REDMINE_URL": "https://your-redmine-instance.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Using other MCP-compatible extensions

Check the extension's documentation for MCP server configuration. The pattern is typically similar to the above.

## Usage with Zed Editor

Add to your Zed settings (`~/.config/zed/settings.json`):

```json
{
  "context_servers": {
    "redmine": {
      "command": {
        "path": "npx",
        "args": ["-y", "@gmlee-ncurity/mcp-server-redmine"],
        "env": {
          "REDMINE_URL": "https://your-redmine-instance.com",
          "REDMINE_API_KEY": "your-api-key-here"
        }
      }
    }
  }
}
```

## Available Tools

### Issue Tools
- `redmine_list_issues` - List issues with filters
- `redmine_get_issue` - Get issue details
- `redmine_create_issue` - Create new issue
- `redmine_update_issue` - Update existing issue
- `redmine_delete_issue` - Delete issue

### Project Tools
- `redmine_list_projects` - List all projects
- `redmine_get_project` - Get project details
- `redmine_get_project_versions` - Get project versions

### User Tools
- `redmine_list_users` - List users
- `redmine_get_current_user` - Get current user info
- `redmine_get_user` - Get specific user details

### Time Entry Tools
- `redmine_list_time_entries` - List time entries
- `redmine_get_time_entry` - Get time entry details
- `redmine_create_time_entry` - Create time entry
- `redmine_update_time_entry` - Update time entry
- `redmine_delete_time_entry` - Delete time entry
- `redmine_list_time_entry_activities` - List activities

### Wiki Tools
- `redmine_list_wiki_pages` - List wiki pages
- `redmine_get_wiki_page` - Get wiki page content
- `redmine_create_or_update_wiki_page` - Create/update wiki page
- `redmine_delete_wiki_page` - Delete wiki page

### Utility Tools
- `redmine_list_statuses` - List issue statuses
- `redmine_list_priorities` - List issue priorities
- `redmine_list_trackers` - List issue trackers
- `redmine_custom_request` - Make custom API request
- `redmine_search` - Search issues, wiki pages, and more

## Example Queries

Once configured, you can ask your AI assistant questions like:

- "Show me all open issues assigned to me"
- "Create a new bug report for the API project"
- "Log 2 hours of work on issue #123 for today"
- "List all projects I have access to"
- "Show me the wiki page about deployment procedures"
- "What issues were updated this week?"
- "Update issue #456 to set priority to high"

## Development

### Running locally

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Debugging with MCP Inspector

```bash
npm run inspector
```

This will start the MCP Inspector on http://localhost:5173

## Security Considerations

- Always use HTTPS for your Redmine URL
- Store API keys securely and never commit them to version control
- Use environment variables for sensitive configuration
- Consider using read-only API keys when write access isn't needed
- Implement proper SSL certificate validation in production

## Troubleshooting

### Connection Issues
- Verify your Redmine URL is accessible
- Check that the API is enabled in Redmine settings
- Ensure your API key has the necessary permissions

### Authentication Errors
- Confirm your API key is valid and active
- If using basic auth, verify username and password
- Check that your user account is active

### SSL/TLS Issues
- For self-signed certificates, set `REDMINE_SSL_VERIFY=false` (not recommended for production)
- Provide the CA certificate path via `REDMINE_CA_CERT`

## Development & Release

### Branch Strategy

This project uses Git Flow with two main branches:
- **`main`** - Production-ready code, triggers releases
- **`develop`** - Integration branch for features (default branch)

### Release Process

To create a release:

```bash
# 1. Ensure you're on develop with latest changes
git checkout develop
git pull origin develop

# 2. Bump version in package.json
npm version patch  # or minor, major

# 3. Push and create PR to main
git push origin develop
gh pr create --base main --head develop --title "Release vX.X.X"

# 4. Merge PR to trigger automated release
```

When the PR is merged to `main`, CI/CD automatically publishes to npm registry.

### CI/CD Pipeline

GitHub Actions automatically:
- Runs tests on Node.js 20.x and 22.x
- Checks linting and builds
- Auto-publishes to npm when merged to `main`
- Uploads test coverage reports

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.