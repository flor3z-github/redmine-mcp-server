# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Branch Strategy**: Development work should be done on the `develop` branch. Releases are created by merging `develop` to `main`.

## Project Overview

This is a Model Context Protocol (MCP) server for Redmine integration, written in TypeScript using ES modules. It enables AI assistants to interact with Redmine project management systems through a comprehensive REST API integration.

## Common Development Commands

### Essential Commands
- `npm run build` - Compile TypeScript to dist/
- `npm run dev` - Run development server with tsx
- `npm test` - Run test suite with Vitest
- `npm run test:coverage` - Run tests with coverage (requires 80% threshold)
- `npm run lint` - ESLint validation for TypeScript files
- `npm run format` - Format code with Prettier
- `npm run inspector` - Start MCP Inspector for debugging tools

### Testing Commands
- `npm test` - Run all tests
- `npm run test:coverage` - Run with coverage reports (80% requirement)
- Individual test files can be run with: `npx vitest src/path/to/test.ts`

### Git Branching Strategy
This project uses a **Git Flow** branching model with two main branches:

#### Branch Structure
- **`main` branch**: Production-ready code, triggers releases
- **`develop` branch**: Integration branch for features (default branch)

#### Development Workflow
**Daily Development (on `develop` branch):**
1. `npm run lint` - Check code style
2. `npm run test` - Ensure tests pass
3. `npm run build` - Verify build succeeds
4. Push to `develop` branch for CI validation

**Release Workflow (from `develop` to `main`):**
1. Create Pull Request from `develop` to `main`
2. Review and merge PR to trigger release
3. Automated release publishes to NPM

### CI/CD Workflow Monitoring
Monitor workflows based on the branch you're working with:

#### Commands for Monitoring
1. **Check workflow status**: `gh run list --repo flor3z-github/redmine-mcp-server --limit 3`
2. **Watch active workflow**: `gh run watch <run-id> --repo flor3z-github/redmine-mcp-server`
3. **View failed logs**: `gh run view --log-failed --job=<job-id> --repo flor3z-github/redmine-mcp-server`
4. **Monitor workflow URL**: https://github.com/flor3z-github/redmine-mcp-server/actions

#### Branch-Specific CI/CD Behavior
**`develop` branch pushes trigger:**
- **Test Jobs**: Linting, testing, and building on Node.js 20.x and 22.x
- **No Publishing**: Development builds don't publish to NPM or create releases

**`main` branch pushes (via merged PR) trigger:**
- **Test Jobs**: Full test suite validation
- **Publish Job**: NPM publishing

**Pull Requests trigger:**
- **Test Jobs Only**: Validates proposed changes without publishing

#### Creating Release Pull Requests
To release changes from `develop` to `main`:

```bash
# 1. Ensure you're on develop with latest changes
git checkout develop
git pull origin develop

# 2. Bump version in package.json
npm version patch  # or minor, major

# 3. Commit version bump
git add package.json package-lock.json
git commit -m "Bump version to vX.X.X for release"

# 4. Push and create PR
git push origin develop
gh pr create --base main --head develop --title "Release vX.X.X"
```

## Architecture Overview

### Core Components
- **Server** (`src/server.ts`): MCP protocol implementation with tool registration
- **Client** (`src/client/index.ts`): Axios-based Redmine REST API client with authentication, SSL handling, and retry logic
- **Configuration** (`src/config.ts`): Zod-validated environment configuration with comprehensive validation
- **Tools** (`src/tools/`): 20+ MCP tools organized by resource type
- **Entry Point** (`src/index.ts`): Process management and error handling

### Tool Architecture
Tools are organized by Redmine resource types:
- **Issues** (`tools/issues.ts`): 5 tools for issue CRUD operations
- **Projects** (`tools/projects.ts`): 3 tools for project management
- **Users** (`tools/users.ts`): 3 tools for user management
- **Time Entries** (`tools/time-entries.ts`): 6 tools for time tracking
- **Wiki** (`tools/wiki.ts`): 4 tools for wiki page management

All tools follow a consistent pattern:
- Zod schema validation for inputs
- Standardized error handling with `formatErrorResponse`
- Formatted output using utility functions
- Comprehensive parameter documentation

### Configuration System
- Environment variables loaded from process.env (no .env file dependency)
- Zod schema validation with detailed error messages
- Supports both API key and basic authentication
- Configurable SSL verification and CA certificates
- Request timeout and retry configuration

### Client Implementation
The Redmine client (`src/client/index.ts`) provides:
- Axios-based HTTP client with interceptors
- Authentication (API key preferred, basic auth fallback)
- SSL configuration and custom CA support
- Request/response logging
- Retry logic with exponential backoff
- Comprehensive error handling

## Testing Framework

Uses Vitest with comprehensive configuration:
- **Unit Tests**: Individual tool and client testing with mocked dependencies
- **Integration Tests**: Full server testing scenarios
- **Coverage Requirements**: 80% across lines, functions, branches, statements
- **Test Organization**: `test/unit/` and `test/integration/` directories

When adding tests:
- Mock external Redmine API calls using Vitest mocks
- Test both success and error scenarios
- Validate input schema handling
- Ensure proper error formatting

## Development Guidelines

### Adding New Tools
1. Follow naming convention: `redmine_[action]_[resource]`
2. Implement in appropriate `tools/[resource].ts` file
3. Add comprehensive input validation with Zod schemas
4. Include detailed descriptions and parameter documentation
5. Handle errors using `formatErrorResponse` utility
6. Export tool and handler in `tools/index.ts`
7. Add comprehensive tests

### Error Handling
- Use custom error classes when appropriate
- Sanitize errors to prevent information leakage
- Provide meaningful error messages to users
- Log errors with appropriate severity levels

### Code Style
- Uses strict TypeScript with ES2022 target
- ESLint + Prettier for formatting
- No `any` types - use proper TypeScript interfaces
- Document complex types with JSDoc comments

## Configuration Requirements

### Required Environment Variables
- `REDMINE_URL` - Redmine instance URL (must be valid URL)
- `REDMINE_API_KEY` - API key (recommended) OR
- `REDMINE_USERNAME` + `REDMINE_PASSWORD` - Basic auth credentials

### Optional Environment Variables
- `REDMINE_SSL_VERIFY` - SSL verification (default: true)
- `REDMINE_CA_CERT` - Custom CA certificate path
- `REDMINE_REQUEST_TIMEOUT` - Request timeout ms (default: 30000)
- `REDMINE_MAX_RETRIES` - Max retry attempts (default: 3)
- `LOG_LEVEL` - Logging level (debug/info/warn/error, default: info)

## Integration Notes

### MCP Client Integration
- Claude Desktop: Use npx with published package or local node execution
- VS Code: Compatible with Cline extension and other MCP-enabled extensions
- Configuration via environment variables in MCP server config (no .env file needed)

### Redmine Compatibility
- Requires Redmine instance with REST API enabled
- API key authentication recommended over basic auth
- Supports SSL/TLS with custom certificates
- Compatible with corporate proxy environments

## File Structure Key Points

- **ES Modules**: Uses `"type": "module"` in package.json
- **Compiled Output**: All builds go to `dist/` directory
- **Source Maps**: Enabled for debugging
- **Declaration Files**: TypeScript definitions generated
- **Tool Organization**: Each Redmine resource type has its own tool file
- **Utility Functions**: Shared formatters and validators in `src/utils/`