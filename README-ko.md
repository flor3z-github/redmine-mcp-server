# Redmine MCP Server

[![npm version](https://img.shields.io/npm/v/@flor3z-github/mcp-server-redmine.svg)](https://www.npmjs.com/package/@flor3z-github/mcp-server-redmine)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![CI](https://github.com/flor3z-github/redmine-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/flor3z-github/redmine-mcp-server/actions/workflows/ci.yml)

[English](README.md) | [사용 가이드](USAGE.md) | [기여 가이드](CONTRIBUTING.md)

Redmine용 Model Context Protocol (MCP) 서버입니다. AI 어시스턴트가 이슈, 프로젝트, 시간 추적, 위키, 파일 등을 관리할 수 있게 해줍니다.

## 빠른 시작

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

> API Key 확인: Redmine → 내 계정 → API 액세스 키 → 표시

### HTTP (Claude Code / 멀티유저)

```bash
REDMINE_URL=https://your-redmine.com npm run start:http
claude mcp add --transport http redmine http://localhost:3000/mcp
# 브라우저 열림 → Redmine API Key 입력 → 인증 완료
```

자세한 설정, Docker 배포, reverse proxy 구성은 [USAGE.md](USAGE.md)를 참고하세요.

## 기능

- **이슈** — 조회, 생성, 수정, 삭제, 필터 검색
- **프로젝트** — 목록 조회, 상세 정보, 버전/마일스톤
- **시간 추적** — 시간 기록, 관리, 활동 목록
- **사용자** — 목록 조회, 상세 정보, 현재 사용자
- **위키** — 페이지 조회, 생성, 수정, 삭제
- **파일 & 첨부** — 파일 업로드, 목록 조회, 첨부 관리
- **저널** — 노트 수정
- **유틸리티** — 상태, 우선순위, 트래커, 커스텀 API 요청, 검색

## 사용 가능한 도구

| 카테고리 | 도구 |
|----------|------|
| 이슈 | `list_issues`, `get_issue`, `create_issue`, `update_issue`, `delete_issue` |
| 프로젝트 | `list_projects`, `get_project`, `get_project_versions` |
| 사용자 | `list_users`, `get_current_user`, `get_user` |
| 시간 기록 | `list_time_entries`, `get_time_entry`, `create_time_entry`, `update_time_entry`, `delete_time_entry`, `list_time_entry_activities` |
| 위키 | `list_wiki_pages`, `get_wiki_page`, `create_or_update_wiki_page`, `delete_wiki_page` |
| 저널 | `update_journal` |
| 첨부 | `get_attachment`, `update_attachment`, `delete_attachment` |
| 파일 | `list_files`, `create_file`, `upload_file` |
| 유틸리티 | `list_statuses`, `list_priorities`, `list_trackers`, `custom_request`, `search` |

모든 도구에는 `redmine_` 접두사가 붙습니다 (예: `redmine_list_issues`).

## 설치

```bash
# 설치 없이 바로 사용
npx @flor3z-github/mcp-server-redmine

# 전역 설치
npm install -g @flor3z-github/mcp-server-redmine
```

## 라이선스

Apache License 2.0 — [LICENSE](LICENSE) 파일을 참고하세요.
