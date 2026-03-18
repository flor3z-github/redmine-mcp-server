# Usage Guide

## Prerequisites

- Node.js >= 20.0.0
- A Redmine instance with API access enabled
- Redmine API key or username/password

### Getting a Redmine API Key

1. Log in to your Redmine instance
2. Go to "My account" (top right)
3. Click on "API access key" in the sidebar
4. Click "Show" to reveal your API key

## Configuration

### Environment Variables

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

# Optional: OAuth (HTTP transport only)
# MCP_ISSUER_URL=https://public-url  # OAuth issuer URL (external HTTPS URL for reverse proxy)
# MCP_DATA_DIR=/data                 # Directory for persistent OAuth data
```

CLI arguments `--transport`, `--port`, `--host` are also supported and take precedence over environment variables.

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
# Development (localhost)
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
$ claude mcp add --transport http redmine http://localhost:3000/mcp
→ "needs authentication" → "Authenticate"
→ Browser opens → Enter Redmine API Key → Submit
→ Authentication complete, MCP tools are available
```

Tokens are persisted to disk (`MCP_DATA_DIR`), so users don't need to re-authenticate on server restart. Access tokens expire after 30 days; refresh tokens are rotated automatically.

### Connecting from Claude Code

```bash
# Local development
claude mcp add --transport http redmine http://localhost:3000/mcp

# Production (via reverse proxy)
claude mcp add --transport http redmine https://mcp.your-domain.com/mcp
```

### Client JSON configuration (HTTP)

```json
{
  "mcpServers": {
    "redmine": {
      "url": "http://localhost:3000/mcp"
    }
  }
}
```

### Production Deployment (Reverse Proxy)

Run the MCP server over HTTP and let a reverse proxy (e.g., nginx) handle HTTPS termination.

```
[Claude Code] --HTTPS--> [nginx + TLS] --HTTP--> [MCP Server :3000]
```

Set `MCP_ISSUER_URL` on the server to point the OAuth issuer to the external HTTPS URL:

```yaml
environment:
  - MCP_ISSUER_URL=https://mcp.your-domain.com
```

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
      # - MCP_ISSUER_URL=https://mcp.your-domain.com  # when using reverse proxy
    volumes:
      - mcp-data:/data

volumes:
  mcp-data:
```

```bash
# Start
docker compose up -d

# Connect (local)
claude mcp add --transport http redmine http://localhost:3000/mcp
```

### Health check

```bash
curl http://localhost:3000/health
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
- For HTTP transport, use a reverse proxy (nginx/traefik) with TLS to protect OAuth tokens and API keys in transit
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
- For self-signed Redmine certificates, set `REDMINE_SSL_VERIFY=false` (not recommended for production)
- Provide the CA certificate path via `REDMINE_CA_CERT`
