# Contributing to Redmine MCP Server

Thank you for your interest in contributing to the Redmine MCP Server! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:
- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive criticism
- Respect differing viewpoints and experiences

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/redmine-mcp-server.git
   cd redmine-mcp-server
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/redmine-mcp-server.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Setup

### Prerequisites
- Node.js >= 20.0.0 (use nvm to install the correct version: `nvm use`)
- A Redmine test instance for development
- Git

### Environment Setup
1. Set environment variables for your test Redmine instance
2. It's recommended to use a dedicated test Redmine instance
3. Configure variables in your development environment or test runner

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Code Style
We use ESLint and Prettier for code formatting:
```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Making Changes

### Branching Strategy
1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Use descriptive branch names:
   - `feature/add-custom-fields-support`
   - `fix/issue-creation-validation`
   - `docs/update-api-examples`

### Commit Guidelines
We follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or modifications
- `refactor:` Code refactoring
- `chore:` Maintenance tasks

Examples:
```bash
git commit -m "feat: add support for issue custom fields"
git commit -m "fix: handle empty response in wiki pages list"
git commit -m "docs: add troubleshooting section for SSL errors"
```

### Code Guidelines

#### TypeScript
- Use strict TypeScript settings
- Define interfaces for all data structures
- Avoid `any` types where possible
- Document complex types with JSDoc comments

#### Error Handling
- Always handle errors gracefully
- Provide meaningful error messages
- Use custom error classes when appropriate
- Log errors appropriately based on severity

#### Testing
- Write tests for new features
- Maintain test coverage above 80%
- Use descriptive test names
- Mock external dependencies properly

#### Tool Development
When adding new tools:
1. Follow the naming convention: `redmine_[action]_[resource]`
2. Provide comprehensive input validation
3. Include detailed descriptions and parameter documentation
4. Format output for readability
5. Handle edge cases and errors

Example tool structure:
```typescript
export const myNewTool: Tool = {
  name: 'redmine_action_resource',
  description: 'Clear description of what this tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Well-documented parameters
    },
    required: ['required_param']
  }
};

export async function myNewToolHandler(input: unknown) {
  try {
    // Validate input
    const params = validateInput(schema, input);
    
    // Perform action
    const result = await redmineClient.someMethod(params);
    
    // Format response
    return {
      content: [{ type: 'text', text: formatResult(result) }]
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true
    };
  }
}
```

## Submitting Changes

### Pull Request Process
1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Rebase your branch**:
   ```bash
   git checkout your-feature-branch
   git rebase main
   ```

3. **Run tests and linting**:
   ```bash
   npm test
   npm run lint
   ```

4. **Push to your fork**:
   ```bash
   git push origin your-feature-branch
   ```

5. **Create a Pull Request** on GitHub

### Pull Request Guidelines
- Use a clear, descriptive title
- Reference any related issues
- Describe what changes you made and why
- Include screenshots for UI changes
- Ensure all tests pass
- Request review from maintainers

### PR Description Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings

## Related Issues
Fixes #123
```

## Testing Guidelines

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Cover edge cases and error scenarios
- Use descriptive test names

### Integration Tests
- Test tool handlers end-to-end
- Use real-like test data
- Verify error handling
- Test with different Redmine configurations

### Manual Testing
Before submitting:
1. Test with a real Redmine instance
2. Verify all affected tools work correctly
3. Check error messages are helpful
4. Ensure backward compatibility

## Documentation

### What to Document
- New tools and their parameters
- Configuration options
- Error messages and troubleshooting
- Examples and use cases

### Documentation Style
- Use clear, simple language
- Include code examples
- Provide context and rationale
- Keep it up to date

## Release Process

Maintainers will:
1. Review and merge PRs
2. Update version numbers
3. Update CHANGELOG.md
4. Publish to npm from the `main` branch release workflow
5. Create GitHub releases manually only when needed

## Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Security**: Email security@example.com
- **Chat**: Join our Discord server

## Recognition

Contributors will be:
- Added to the CONTRIBUTORS.md file
- Mentioned in release notes
- Given credit in the README

Thank you for contributing to Redmine MCP Server!
