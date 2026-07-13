# Redmine MCP Server Setup Guide

This guide will help you set up the Redmine MCP Server with various clients and configurations.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Redmine Configuration](#redmine-configuration)
3. [Installation Methods](#installation-methods)
4. [Client Configuration](#client-configuration)
5. [Environment Variables](#environment-variables)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- Node.js >= 20.0.0
- npm or yarn package manager
- Git (for development setup)

### Redmine Requirements
- Redmine 3.0 or higher
- API access enabled
- Valid user account with API key

## Redmine Configuration

### Enable API Access

1. Log in to Redmine as an administrator
2. Go to **Administration → Settings → API**
3. Check "Enable REST web service"
4. Click "Save"

### Generate API Key

1. Log in to your Redmine account
2. Go to **My account** (top-right menu)
3. Look for "API access key" in the sidebar
4. Click "Show" to reveal your API key
5. Copy the API key for later use

### Create Limited API Key (Recommended)

For production use, create a dedicated user with limited permissions:

1. Create a new user account for the MCP server
2. Assign only necessary permissions:
   - View issues
   - Create issues
   - Edit issues (if needed)
   - Log time (if needed)
   - View wiki pages (if needed)
3. Add the user to relevant projects
4. Generate API key for this user

## Installation Methods

### Method 1: NPM Package (Recommended for Users)

```bash
# Global installation
npm install -g @flor3z-github/mcp-server-redmine

# Or use directly with npx (no installation needed)
npx @flor3z-github/mcp-server-redmine
```

### Method 2: Local Development

```bash
# Clone the repository
git clone https://github.com/flor3z-github/redmine-mcp-server.git
cd redmine-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run locally
npm start
```

### Method 3: Local Docker Build

No published Docker image is currently provided. Build the image from the repository root after cloning the project.
The container runs the Streamable HTTP transport by default, so users authenticate with their Redmine API key through the browser flow.

```bash
docker build -t redmine-mcp-server .
docker run -e REDMINE_URL=https://your-redmine.com \
           -e MCP_HOST=0.0.0.0 \
           -e MCP_PORT=3000 \
           -e MCP_DATA_DIR=/data \
           -p 3000:3000 \
           -v redmine-mcp-data:/data \
           redmine-mcp-server
```

## Client Configuration

### Claude Desktop

Location of config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

#### Using NPM Package

```json
{
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "@flor3z-github/mcp-server-redmine"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Using Local Installation

```json
{
  "mcpServers": {
    "redmine": {
      "command": "node",
      "args": ["/absolute/path/to/redmine-mcp-server/dist/index.js"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### VS Code with Cline

1. Install the Cline extension from VS Code marketplace
2. Open VS Code settings (Cmd/Ctrl + ,)
3. Search for "Cline MCP"
4. Click "Edit in settings.json"
5. Add the configuration:

```json
{
  "cline.mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "@flor3z-github/mcp-server-redmine"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### VS Code with Continue

1. Install the Continue extension
2. Open the Continue configuration
3. Add to `~/.continue/config.json`:

```json
{
  "models": [...],
  "mcpServers": {
    "redmine": {
      "command": "npx",
      "args": ["-y", "@flor3z-github/mcp-server-redmine"],
      "env": {
        "REDMINE_URL": "https://your-redmine.com",
        "REDMINE_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `REDMINE_URL` | Your Redmine instance URL | `https://redmine.company.com` |
| `REDMINE_API_KEY` | API key for authentication | `abcd1234...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REDMINE_USERNAME` | Username for basic auth | - |
| `REDMINE_PASSWORD` | Password for basic auth | - |
| `REDMINE_SSL_VERIFY` | Verify SSL certificates | `true` |
| `REDMINE_CA_CERT` | Path to custom CA certificate | - |
| `REDMINE_REQUEST_TIMEOUT` | Request timeout in ms | `30000` |
| `REDMINE_MAX_RETRIES` | Max retry attempts | `3` |
| `LOG_LEVEL` | Logging level | `info` |

### Configuration in MCP Clients

Environment variables are configured directly in your MCP client configuration. No `.env` file is needed or used.

## SSL/TLS Configuration

### For Self-Signed Certificates

#### Option 1: Disable Verification (Not Recommended)

```json
{
  "env": {
    "REDMINE_URL": "https://your-redmine.com",
    "REDMINE_API_KEY": "your-key",
    "REDMINE_SSL_VERIFY": "false"
  }
}
```

#### Option 2: Provide CA Certificate (Recommended)

1. Export your CA certificate:
   ```bash
   openssl s_client -connect your-redmine.com:443 -showcerts
   ```

2. Save the CA certificate to a file

3. Configure the path:
   ```json
   {
     "env": {
       "REDMINE_URL": "https://your-redmine.com",
       "REDMINE_API_KEY": "your-key",
       "REDMINE_CA_CERT": "/path/to/ca-cert.pem"
     }
   }
   ```

### For Corporate Proxies

Set proxy environment variables:

```json
{
  "env": {
    "REDMINE_URL": "https://your-redmine.com",
    "REDMINE_API_KEY": "your-key",
    "HTTP_PROXY": "http://proxy.company.com:8080",
    "HTTPS_PROXY": "http://proxy.company.com:8080"
  }
}
```

## Troubleshooting

### Common Issues

#### 1. "Cannot connect to Redmine"

**Symptoms:**
- Connection timeout errors
- "ECONNREFUSED" errors

**Solutions:**
- Verify the Redmine URL is correct
- Check if Redmine is accessible from your network
- Test with curl: `curl -I https://your-redmine.com`
- Check firewall/proxy settings

#### 2. "Authentication failed"

**Symptoms:**
- 401 Unauthorized errors
- "Invalid API key" messages

**Solutions:**
- Verify API key is correct
- Check if API access is enabled in Redmine
- Ensure user account is active
- Try regenerating the API key

#### 3. "Permission denied"

**Symptoms:**
- 403 Forbidden errors
- "You are not authorized" messages

**Solutions:**
- Check user permissions in Redmine
- Verify user has access to the project
- Ensure user has required permissions for the action
- Add user to project with appropriate role

#### 4. "SSL certificate problem"

**Symptoms:**
- SSL verification errors
- "self signed certificate" errors

**Solutions:**
- For development only: Set `REDMINE_SSL_VERIFY=false`
- For production: Add CA certificate path
- Update Node.js to latest version
- Check system certificate store

#### 5. "Tool not found"

**Symptoms:**
- "Unknown tool" errors in Claude/Cline
- Tools not appearing in list

**Solutions:**
- Restart the MCP client
- Check server logs for errors
- Verify installation completed successfully
- Ensure config file is valid JSON

### Debug Mode

Enable debug logging to troubleshoot issues:

```json
{
  "env": {
    "REDMINE_URL": "https://your-redmine.com",
    "REDMINE_API_KEY": "your-key",
    "LOG_LEVEL": "debug"
  }
}
```

### Testing Connection

Use the MCP Inspector to test your setup:

```bash
# From the project directory
npm run inspector

# Or with environment variables
REDMINE_URL=https://your-redmine.com \
REDMINE_API_KEY=your-key \
npm run inspector
```

Then open http://localhost:5173 to test tools interactively.

### Manual Testing

Test your configuration with curl:

```bash
# Test API access
curl -H "X-Redmine-API-Key: your-key" \
     https://your-redmine.com/users/current.json

# Test project access
curl -H "X-Redmine-API-Key: your-key" \
     https://your-redmine.com/projects.json
```

### Logging

Check logs in different locations:

**Claude Desktop:**
- macOS: `~/Library/Logs/Claude/`
- Windows: `%LOCALAPPDATA%\Claude\logs\`

**VS Code:**
- View → Output → Select "Cline" or "Continue"

**Server logs:**
- Errors are printed to stderr
- Enable debug mode for verbose output

## Performance Optimization

### Caching

The server implements basic caching for:
- User information
- Project metadata
- Enumeration values (statuses, priorities)

### Rate Limiting

To avoid overwhelming your Redmine server:
- Configure appropriate timeout values
- Use pagination for large result sets
- Implement client-side rate limiting if needed

### Connection Pooling

The server reuses HTTP connections for better performance:
- Persistent connections are maintained
- Automatic retry with exponential backoff
- Connection timeout after idle period

## Security Best Practices

1. **API Key Management**
   - Never commit API keys to version control
   - Use environment variables or secure vaults
   - Rotate API keys regularly
   - Use read-only keys when possible

2. **Network Security**
   - Always use HTTPS
   - Verify SSL certificates in production
   - Use VPN for internal Redmine instances
   - Implement IP whitelisting if available

3. **Permission Management**
   - Create dedicated user accounts
   - Grant minimal required permissions
   - Regular audit of access rights
   - Remove unused API keys

4. **Data Protection**
   - Be cautious with sensitive issue data
   - Implement data retention policies
   - Consider GDPR compliance
   - Encrypt sensitive configuration

## Advanced Configuration

### Multiple Redmine Instances

Configure multiple servers with different names:

```json
{
  "mcpServers": {
    "redmine-prod": {
      "command": "npx",
      "args": ["-y", "@flor3z-github/mcp-server-redmine"],
      "env": {
        "REDMINE_URL": "https://prod.redmine.com",
        "REDMINE_API_KEY": "prod-key"
      }
    },
    "redmine-dev": {
      "command": "npx",
      "args": ["-y", "@flor3z-github/mcp-server-redmine"],
      "env": {
        "REDMINE_URL": "https://dev.redmine.com",
        "REDMINE_API_KEY": "dev-key"
      }
    }
  }
}
```

### Custom Timeout Configuration

For slow networks or large instances:

```json
{
  "env": {
    "REDMINE_URL": "https://your-redmine.com",
    "REDMINE_API_KEY": "your-key",
    "REDMINE_REQUEST_TIMEOUT": "60000",
    "REDMINE_MAX_RETRIES": "5"
  }
}
```

### Using with Docker Compose

```yaml
version: '3.8'
services:
  redmine-mcp:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDMINE_URL=https://your-redmine.com
      - MCP_HOST=0.0.0.0
      - MCP_PORT=3000
      - MCP_DATA_DIR=/data
      # Set this when using an external HTTPS reverse proxy:
      # - MCP_ISSUER_URL=https://mcp.your-domain.com
    volumes:
      - mcp-data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
    restart: unless-stopped

volumes:
  mcp-data:
```

## Getting Help

### Resources

1. **Documentation**
   - [API Documentation](./API.md)
   - [Contributing Guide](./CONTRIBUTING.md)
   - [GitHub Issues](https://github.com/flor3z-github/redmine-mcp-server/issues)

2. **Community**
   - Discord Server: [Join here]
   - GitHub Discussions: [Ask questions]
   - Stack Overflow: Tag with `redmine-mcp`

3. **Support**
   - Bug Reports: Use GitHub Issues
   - Feature Requests: Use GitHub Discussions
   - Security Issues: Email security@example.com

### FAQ

**Q: Can I use this with Redmine 2.x?**
A: The server requires Redmine 3.0+ for full functionality. Some features may work with 2.x but are not officially supported.

**Q: How do I add custom fields?**
A: Custom fields are supported through the `custom_field_values` parameter in create/update operations.

**Q: Can I use this with Redmine plugins?**
A: Yes, if the plugin exposes REST API endpoints. Use the `redmine_custom_request` tool for plugin-specific endpoints.

**Q: Is there a rate limit?**
A: The server doesn't impose rate limits, but your Redmine instance might. Check your Redmine configuration.

**Q: Can I contribute?**
A: Yes! See our [Contributing Guide](./CONTRIBUTING.md) for details.
