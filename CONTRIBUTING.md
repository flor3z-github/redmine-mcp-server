# Contributing

Contributions are welcome! Please read through this guide before submitting pull requests.

## Development Setup

```bash
git clone https://github.com/flor3z-github/redmine-mcp-server.git
cd redmine-mcp-server
npm install
npm run build
```

### Running Tests

```bash
npm test                # Run all tests
npm run test:coverage   # Run with coverage report
npm run lint            # Run linter
```

### Running Locally

```bash
# Stdio mode
REDMINE_URL=https://your-redmine.com REDMINE_API_KEY=your-key npm run dev

# HTTP mode
REDMINE_URL=https://your-redmine.com npm run dev:http
```

## Branch Strategy

This project uses Git Flow with two main branches:

- **`main`** — Production-ready code, triggers npm releases
- **`develop`** — Integration branch for features (default branch)

### Workflow

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/your-feature
   ```

2. Make your changes and commit

3. Push and create a PR to `develop`:
   ```bash
   git push origin feature/your-feature
   gh pr create --base develop
   ```

4. After review and merge, the feature branch can be deleted

## Release Process

```bash
# 1. Ensure develop is up to date
git checkout develop
git pull origin develop

# 2. Bump version
npm version patch  # or minor, major

# 3. Push and create PR to main
git push origin develop
gh pr create --base main --head develop --title "Release vX.X.X"

# 4. Merge PR → CI/CD auto-publishes to npm
```

## CI/CD Pipeline

GitHub Actions automatically:
- Runs tests on Node.js 20.x, 22.x, and 24.x
- Checks linting and builds
- Auto-publishes to npm when merged to `main`
- Uploads test coverage reports

## Guidelines

- Write tests for new features
- Follow existing code style (ESLint + Prettier)
- Keep commits focused and well-described
- Update documentation for user-facing changes
