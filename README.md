# Redmine MCP Server

[![npm version](https://img.shields.io/npm/v/@flor3z-github/mcp-server-redmine.svg)](https://www.npmjs.com/package/@flor3z-github/mcp-server-redmine)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/flor3z-github/redmine-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/flor3z-github/redmine-mcp-server/actions/workflows/ci.yml)

A Model Context Protocol (MCP) server that enables AI assistants to interact with Redmine project management systems. This server provides comprehensive access to Redmine's features including issues, projects, time tracking, users, wiki pages, file management, and more.

## Quick Start

### Stdio (Claude Desktop / VS Code)

```bash
# 1. Get your Redmine API key from: My account → API access key → Show

# 2. Add to Claude Desktop config (~/.config/Claude/claude_desktop_config.json):
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "@flor3z-github/mcp-server-redmine"],
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

### HTTP (Claude Code / Multi-user)

```bash
# 1. Start the server
REDMINE_URL=https://your-redmine.com npm run start:http

# 2. Connect from Claude Code (browser opens for API Key input)
claude mcp add redmine http://localhost:3000/mcp
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

### File & Attachment Management
- List, upload, and manage project files
- Get, update, and delete attachments
- Update journal notes

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
npm install -g @flor3z-github/mcp-server-redmine
```

### Direct Usage (no installation required)

```bash
npx @flor3z-github/mcp-server-redmine
```

### For local development

```bash
# Clone the repository
git clone https://github.com/flor3z-github/redmine-mcp-server.git
cd redmine-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

### Environment Variables

Configure the server using environment variables:

```bash
# Required
REDMINE_URL=https://your-redmine-instance.com

# Authentication (required for stdio mode, optional for HTTP mode)
REDMINE_API_KEY=your-api-key-here
# Or basic auth:
# REDMINE_USERNAME=your-username
# REDMINE_PASSWORD=your-password

# Optional: SSL configuration
# REDMINE_SSL_VERIFY=true
# REDMINE_CA_CERT=/path/to/ca.crt

# Optional: Request configuration
# REDMINE_REQUEST_TIMEOUT=30000
# REDMINE_MAX_RETRIES=3

# Optional: Transport configuration
# MCP_TRANSPORT=stdio          # "stdio" (default) or "streamable-http"
# MCP_PORT=3000                # HTTP server port (default: 3000)
# MCP_HOST=127.0.0.1           # HTTP bind host (default: 127.0.0.1)

# Optional: OAuth / TLS (HTTP transport only)
# MCP_ISSUER_URL=https://public-url  # Override OAuth issuer URL (for reverse proxy)
# MCP_DATA_DIR=/data                 # Directory for persistent OAuth data
# MCP_TLS_CERT=/path/to/server.crt   # TLS certificate file
# MCP_TLS_KEY=/path/to/server.key    # TLS private key file
```

CLI arguments `--transport`, `--port`, `--host` are also supported and take precedence over environment variables.

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
      "args": ["-y", "@flor3z-github/mcp-server-redmine"],
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

## Usage with HTTP Transport (Streamable HTTP)

The HTTP transport enables multi-user deployments with OAuth 2.1 authentication. Each user authenticates with their own Redmine API Key via a browser-based flow.

```bash
# Development (localhost, no TLS required)
REDMINE_URL=https://your-redmine.com npm run dev:http

# Production
REDMINE_URL=https://your-redmine.com npm run start:http

# Custom port
MCP_PORT=8080 REDMINE_URL=https://your-redmine.com npm run dev:http
```

### Authentication (OAuth 2.1)

The HTTP transport uses MCP SDK's built-in OAuth 2.1 flow. When a client connects:

1. The SDK discovers the OAuth server via `/.well-known/oauth-authorization-server`
2. The client dynamically registers via `/register`
3. A browser window opens showing the API Key input form
4. The user enters their Redmine API Key
5. The server validates the key against Redmine (`/users/current.json`)
6. An OAuth access token is issued and the client proceeds

**User experience:**
```
$ claude mcp add redmine https://your-server:3000/mcp
→ "needs authentication" → "Authenticate"
→ Browser opens → Enter Redmine API Key → Submit
→ Authentication complete, MCP tools are available
```

Tokens are persisted to disk (`MCP_DATA_DIR`), so users don't need to re-authenticate on server restart. Access tokens expire after 30 days; refresh tokens are rotated automatically.

### Connecting from Claude Code

```bash
# Local development (HTTP)
claude mcp add redmine http://localhost:3000/mcp

# Production (HTTPS)
claude mcp add redmine https://your-server:3000/mcp
```

### Client JSON configuration (HTTP)

```json
{
  "mcpServers": {
    "redmine": {
      "url": "https://your-server:3000/mcp"
    }
  }
}
```

### TLS / HTTPS Configuration

For production deployments, configure TLS with environment variables:

```bash
MCP_TLS_CERT=/path/to/server.crt
MCP_TLS_KEY=/path/to/server.key
```

Generate a self-signed certificate for internal use:
```bash
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/server.key -out certs/server.crt \
  -days 365 -nodes -subj "/CN=your-server-hostname"
```

| Environment | TLS Config | issuerUrl | Notes |
|-------------|-----------|-----------|-------|
| Local dev | None | `http://localhost:3000` | SDK allows HTTP for localhost |
| Direct TLS | cert+key | `https://host:3000` | Self-signed or internal CA |
| Reverse proxy | None | `MCP_ISSUER_URL=https://public-url` | nginx/traefik handles TLS |

### Docker Deployment

```yaml
# docker-compose.yml
services:
  redmine-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDMINE_URL=https://your-redmine.example.com
      - MCP_HOST=0.0.0.0
      - MCP_PORT=3000
      - MCP_DATA_DIR=/data
      - MCP_TLS_CERT=/certs/server.crt
      - MCP_TLS_KEY=/certs/server.key
    volumes:
      - mcp-data:/data
      - ./certs:/certs:ro

volumes:
  mcp-data:
```

```bash
# Generate certificates
mkdir -p certs
openssl req -x509 -newkey rsa:2048 -keyout certs/server.key -out certs/server.crt \
  -days 365 -nodes -subj "/CN=your-server"

# Start
docker compose up -d

# Connect
claude mcp add redmine https://your-server:3000/mcp
```

### Health check

```bash
curl -k https://localhost:3000/health
# => {"status":"ok","sessions":0}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/mcp` | JSON-RPC message handling (Bearer auth) |
| GET | `/mcp` | SSE stream (Bearer auth) |
| DELETE | `/mcp` | Session termination (Bearer auth) |
| GET | `/health` | Health check (no auth) |
| GET | `/.well-known/oauth-authorization-server` | OAuth metadata |
| GET | `/.well-known/oauth-protected-resource` | Protected resource metadata |
| POST | `/authorize` | OAuth authorization (renders API Key form) |
| POST | `/authorize/callback` | API Key form submission |
| POST | `/token` | Token exchange / refresh |
| POST | `/register` | Dynamic client registration |
| POST | `/revoke` | Token revocation |

## Usage with VS Code

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
      "args": ["-y", "@flor3z-github/mcp-server-redmine"],
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
        "args": ["-y", "@flor3z-github/mcp-server-redmine"],
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

### Journal Tools
- `redmine_update_journal` - Update journal notes

### Attachment Tools
- `redmine_get_attachment` - Get attachment details
- `redmine_update_attachment` - Update attachment metadata
- `redmine_delete_attachment` - Delete attachment

### File Tools
- `redmine_list_files` - List project files
- `redmine_create_file` - Attach uploaded file to project
- `redmine_upload_file` - Upload file to Redmine

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
- "Upload this file and attach it to issue #789"

## Development

### Running locally

```bash
# Install dependencies
npm install

# Run in development mode (stdio)
npm run dev

# Run in development mode (HTTP)
npm run dev:http

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
- For HTTP transport, use TLS (`MCP_TLS_CERT`/`MCP_TLS_KEY`) to protect OAuth tokens and API keys in transit
- OAuth tokens are persisted in `MCP_DATA_DIR` — ensure proper file permissions on the data directory

## Troubleshooting

### Connection Issues
- Verify your Redmine URL is accessible
- Check that the API is enabled in Redmine settings
- Ensure your API key has the necessary permissions

### Authentication Errors (Stdio)
- Confirm your API key is valid and active
- If using basic auth, verify username and password
- Check that your user account is active

### Authentication Errors (HTTP / OAuth)
- If the browser auth page shows "API Key is invalid", verify the key in Redmine → My account → API access key
- If the client receives 401, the access token may have expired — the client should automatically refresh via the refresh token
- Check that `MCP_DATA_DIR` is writable by the server process
- For reverse proxy setups, ensure `MCP_ISSUER_URL` matches the public URL the client uses

### SSL/TLS Issues
- For self-signed certificates, set `REDMINE_SSL_VERIFY=false` (not recommended for production)
- Provide the CA certificate path via `REDMINE_CA_CERT`
- For self-signed MCP server TLS certs, clients may need to trust the CA or use `NODE_EXTRA_CA_CERTS`

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
- Runs tests on Node.js 20.x, 22.x, and 24.x
- Checks linting and builds
- Auto-publishes to npm when merged to `main`
- Uploads test coverage reports

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## License

This project is licensed under the Apache License 2.0 - see the LICENSE file for details.
