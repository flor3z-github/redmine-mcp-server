# Redmine MCP Server

[![npm version](https://img.shields.io/npm/v/@flor3z-github/mcp-server-redmine.svg)](https://www.npmjs.com/package/@flor3z-github/mcp-server-redmine)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/flor3z-github/redmine-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/flor3z-github/redmine-mcp-server/actions/workflows/ci.yml)

[한국어](README-ko.md) | [Usage Guide](USAGE.md) | [Contributing](CONTRIBUTING.md)

A Model Context Protocol (MCP) server for Redmine. Enables AI assistants to manage issues, projects, time tracking, wiki pages, files, and more.

## Quick Start

### Stdio (Claude Desktop / VS Code)

```json
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
```

### HTTP (Claude Code / Multi-user)

```bash
REDMINE_URL=https://your-redmine.com npm run start:http
claude mcp add --transport http redmine http://localhost:3000/mcp
# Browser opens → Enter Redmine API Key → Done
```

See [USAGE.md](USAGE.md) for detailed configuration, Docker deployment, and reverse proxy setup.

## Features

- **Issues** — List, create, update, delete, search with filters
- **Projects** — List, view details, versions/milestones
- **Time Tracking** — Log entries, manage records, list activities
- **Users** — List, get details, current user info
- **Wiki** — List, create, update, delete pages
- **Files & Attachments** — Upload, list, manage files and attachments
- **Journals** — Update notes
- **Utilities** — Statuses, priorities, trackers, custom API requests, search

## Available Tools

| Category | Tools |
|----------|-------|
| Issues | `list_issues`, `get_issue`, `create_issue`, `update_issue`, `delete_issue` |
| Projects | `list_projects`, `get_project`, `get_project_versions` |
| Users | `list_users`, `get_current_user`, `get_user` |
| Time Entries | `list_time_entries`, `get_time_entry`, `create_time_entry`, `update_time_entry`, `delete_time_entry`, `list_time_entry_activities` |
| Wiki | `list_wiki_pages`, `get_wiki_page`, `create_or_update_wiki_page`, `delete_wiki_page` |
| Journals | `update_journal` |
| Attachments | `get_attachment`, `update_attachment`, `delete_attachment` |
| Files | `list_files`, `create_file`, `upload_file` |
| Utilities | `list_statuses`, `list_priorities`, `list_trackers`, `custom_request`, `search` |

All tools are prefixed with `redmine_` (e.g., `redmine_list_issues`).

## Installation

```bash
# Direct usage (no install)
npx @flor3z-github/mcp-server-redmine

# Global install
npm install -g @flor3z-github/mcp-server-redmine
```

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
