# get_issue Token Reduction & Comment Pagination — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `redmine_get_issue` cheap by default — comments opt-in, paginated, and length-capped — while adding input validation.

**Architecture:** The token cost is controlled at the tool/formatter layer. The Redmine client still fetches the full issue (Redmine has no per-issue journal pagination); a pure formatter slices/truncates before returning to the model. `getIssue` gains a validated schema; `formatIssue` gains an options object; a new pure `formatJournals` renders the comment window.

**Tech Stack:** TypeScript (ES modules), Zod validation, Vitest, `@modelcontextprotocol/sdk`.

## Global Constraints

- Node ES modules — all local imports use `.js` extension (e.g. `../client/types.js`).
- No `any` types.
- Team-internal fork — breaking changes allowed; no backward-compat guarantee for external npm consumers.
- Test coverage threshold: 80% (lines/functions/branches/statements).
- `npm test` runs Vitest in **watch** mode. Always use `npx vitest run <file>` for one-shot runs in these steps.
- Korean/multibyte text: truncation uses JS `substring` (UTF-16 code units), safe for BMP (Korean). Reuse existing `truncateText`.
- Commit style: conventional commits, end body with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.

---

## File Structure

- `src/utils/formatters.ts` (modify) — add `FormatIssueOptions` interface, add exported pure `formatJournals`, extend `formatIssue` to accept options. Add `Journal` to the type import.
- `test/unit/formatters.test.ts` (create) — unit tests for `formatJournals` and `formatIssue` truncation.
- `src/utils/validators.ts` (modify) — add exported `getIssueSchema`.
- `src/tools/issues.ts` (modify) — add local `buildInclude` helper; rewrite `getIssueTool.inputSchema` (7 params) and `getIssue` handler to validate + map options.
- `test/unit/tools.test.ts` (modify) — extend the existing `describe('getIssue')` block with new behavior tests.
- `README.md` / `docs/API.md` (modify) — document new params + breaking change.

**No changes** to `src/client/index.ts` (its `getIssue(id, include[])` is reused as-is) or `src/client/types.ts` (`Journal` type already fits).

---

## Task 1: Formatter options + `formatJournals` pure function

**Files:**
- Modify: `src/utils/formatters.ts:1-57`
- Test: `test/unit/formatters.test.ts` (create)

**Interfaces:**
- Consumes: existing `truncateText(text, maxLength)`, `Journal` type from `../client/types.js`.
- Produces:
  ```ts
  export interface FormatIssueOptions {
    descriptionMaxChars?: number;   // undefined/0 => unlimited
    includeJournals?: boolean;      // default false
    journalsLimit?: number;         // default 10
    journalsOffset?: number;        // default 0
    journalsOrder?: 'asc' | 'desc'; // default 'desc' (offset 0 = newest)
    journalNotesMaxChars?: number;  // undefined/0 => unlimited
  }
  export function formatJournals(journals: Journal[] | undefined, opts?: FormatIssueOptions): string;
  export function formatIssue(issue: RedmineIssue, opts?: FormatIssueOptions): string;
  ```
  Behavior contract for `formatJournals`:
  - `journals === undefined` (not fetched) → `''` (no line at all — preserves list/create/update output).
  - fetched but zero note-bearing journals → `'\nComments: none'`.
  - `includeJournals` falsy → `'\nComments: N total (not shown — pass include_journals=true)'`.
  - `journalsOffset >= total` → `'\nComments: N total (offset K exceeds range)'`.
  - else → header `'\nComments: N total (showing A-B, newest first|oldest first)'` + one line per windowed comment; each note over the cap is truncated with a drill-down marker.

- [ ] **Step 1: Write the failing test**

Create `test/unit/formatters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatJournals, formatIssue } from '../../src/utils/formatters.js';
import type { Journal, RedmineIssue } from '../../src/client/types.js';

function journal(id: number, notes?: string): Journal {
  return {
    id,
    user: { id: 1, name: `User${id}` },
    notes,
    created_on: `2026-07-1${id}T00:00:00Z`,
    private_notes: false,
  };
}

describe('formatJournals', () => {
  it('returns empty string when journals not fetched (undefined)', () => {
    expect(formatJournals(undefined)).toBe('');
  });

  it('returns "Comments: none" when fetched but no note-bearing journals', () => {
    expect(formatJournals([journal(1), journal(2, '   ')])).toBe('\nComments: none');
  });

  it('shows only the count when includeJournals is false', () => {
    const js = [journal(1, 'a'), journal(2, 'b'), journal(3, 'c')];
    expect(formatJournals(js, { includeJournals: false })).toBe(
      '\nComments: 3 total (not shown — pass include_journals=true)'
    );
  });

  it('counts only note-bearing journals', () => {
    const js = [journal(1, 'has note'), journal(2), journal(3, 'also note')];
    const out = formatJournals(js, { includeJournals: false });
    expect(out).toContain('2 total');
  });

  it('renders newest first by default and respects limit', () => {
    const js = [journal(1, 'oldest'), journal(2, 'middle'), journal(3, 'newest')];
    const out = formatJournals(js, { includeJournals: true, journalsLimit: 2 });
    expect(out).toContain('Comments: 3 total (showing 0-1, newest first)');
    expect(out).toContain('newest');
    expect(out).toContain('middle');
    expect(out).not.toContain('oldest');
  });

  it('honors ascending order', () => {
    const js = [journal(1, 'oldest'), journal(2, 'newest')];
    const out = formatJournals(js, { includeJournals: true, journalsOrder: 'asc', journalsLimit: 1 });
    expect(out).toContain('oldest first');
    expect(out).toContain('oldest');
    expect(out).not.toContain('newest');
  });

  it('applies offset window', () => {
    const js = [journal(1, 'c0-old'), journal(2, 'c1'), journal(3, 'c2-new')];
    const out = formatJournals(js, { includeJournals: true, journalsOffset: 1, journalsLimit: 1 });
    // desc order: [c2-new, c1, c0-old]; offset 1 => c1
    expect(out).toContain('showing 1-1');
    expect(out).toContain('c1');
    expect(out).not.toContain('c2-new');
    expect(out).not.toContain('c0-old');
  });

  it('reports out-of-range offset', () => {
    const js = [journal(1, 'a'), journal(2, 'b')];
    const out = formatJournals(js, { includeJournals: true, journalsOffset: 5 });
    expect(out).toBe('\nComments: 2 total (offset 5 exceeds range)');
  });

  it('truncates long notes and appends a drill-down marker', () => {
    const long = 'x'.repeat(50);
    const js = [journal(1, long)];
    const out = formatJournals(js, { includeJournals: true, journalNotesMaxChars: 10 });
    expect(out).toContain('xxxxxxxxxx …(+40 chars truncated');
    expect(out).toContain('journals_offset=0 journals_limit=1 journal_notes_max_chars=0 for full');
  });

  it('does not truncate when cap is 0 (unlimited escape hatch)', () => {
    const long = 'y'.repeat(50);
    const js = [journal(1, long)];
    const out = formatJournals(js, { includeJournals: true, journalNotesMaxChars: 0 });
    expect(out).toContain(long);
    expect(out).not.toContain('truncated');
  });
});

describe('formatIssue with options', () => {
  const baseIssue = {
    id: 1,
    subject: 'S',
    project: { name: 'P' },
    status: { name: 'New' },
    priority: { name: 'Normal' },
    author: { name: 'A' },
    done_ratio: 0,
    description: 'D'.repeat(1000),
  } as unknown as RedmineIssue;

  it('returns full description when no cap given', () => {
    const out = formatIssue(baseIssue);
    expect(out).toContain('D'.repeat(1000));
  });

  it('truncates description when descriptionMaxChars set', () => {
    const out = formatIssue(baseIssue, { descriptionMaxChars: 100 });
    expect(out).not.toContain('D'.repeat(200));
    expect(out).toContain('...');
  });

  it('omits any Comments line when issue has no journals field', () => {
    const out = formatIssue(baseIssue);
    expect(out).not.toContain('Comments');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/unit/formatters.test.ts`
Expected: FAIL — `formatJournals` is not exported / `formatIssue` ignores options.

- [ ] **Step 3: Write minimal implementation**

In `src/utils/formatters.ts`, update the type import at the top (line 1-9) to add `Journal`:

```ts
import type {
  Attachment,
  Journal,
  RedmineFile,
  RedmineIssue,
  RedmineProject,
  RedmineUser,
  TimeEntry,
  WikiPage,
} from '../client/types.js';
```

Replace the whole `formatIssue` function (lines 11-57) with:

```ts
export interface FormatIssueOptions {
  descriptionMaxChars?: number;
  includeJournals?: boolean;
  journalsLimit?: number;
  journalsOffset?: number;
  journalsOrder?: 'asc' | 'desc';
  journalNotesMaxChars?: number;
}

export function formatJournals(
  journals: Journal[] | undefined,
  opts: FormatIssueOptions = {}
): string {
  if (journals === undefined) {
    return '';
  }

  const withNotes = journals.filter(
    (j) => typeof j.notes === 'string' && j.notes.trim().length > 0
  );
  const total = withNotes.length;
  if (total === 0) {
    return '\nComments: none';
  }

  if (!opts.includeJournals) {
    return `\nComments: ${total} total (not shown — pass include_journals=true)`;
  }

  const order = opts.journalsOrder ?? 'desc';
  const ordered = order === 'desc' ? [...withNotes].reverse() : [...withNotes];

  const offset = opts.journalsOffset ?? 0;
  const limit = opts.journalsLimit ?? 10;
  if (offset >= total) {
    return `\nComments: ${total} total (offset ${offset} exceeds range)`;
  }

  const windowed = ordered.slice(offset, offset + limit);
  const shownEnd = offset + windowed.length - 1;
  const orderLabel = order === 'desc' ? 'newest first' : 'oldest first';
  const noteCap = opts.journalNotesMaxChars ?? 0;

  const lines = [
    `\nComments: ${total} total (showing ${offset}-${shownEnd}, ${orderLabel})`,
  ];

  windowed.forEach((j, i) => {
    const absoluteIndex = offset + i;
    const fullNote = j.notes as string;
    let note = fullNote;
    let marker = '';
    if (noteCap > 0 && fullNote.length > noteCap) {
      const cut = fullNote.length - noteCap;
      note = fullNote.substring(0, noteCap);
      marker =
        ` …(+${cut} chars truncated, journals_offset=${absoluteIndex} ` +
        `journals_limit=1 journal_notes_max_chars=0 for full)`;
    }
    lines.push(`- ${j.user.name} (${j.created_on}): ${note}${marker}`);
  });

  return lines.join('\n');
}

export function formatIssue(issue: RedmineIssue, opts: FormatIssueOptions = {}): string {
  const parts = [
    `#${issue.id} - ${issue.subject}`,
    `Project: ${issue.project.name}`,
    `Status: ${issue.status.name}`,
    `Priority: ${issue.priority.name}`,
    `Author: ${issue.author.name}`,
  ];

  if (issue.assigned_to) {
    parts.push(`Assigned to: ${issue.assigned_to.name}`);
  }

  if (issue.done_ratio > 0) {
    parts.push(`Progress: ${issue.done_ratio}%`);
  }

  if (issue.due_date) {
    parts.push(`Due date: ${issue.due_date}`);
  }

  if (issue.description) {
    const desc =
      opts.descriptionMaxChars && opts.descriptionMaxChars > 0
        ? truncateText(issue.description, opts.descriptionMaxChars)
        : issue.description;
    parts.push(`\nDescription:\n${desc}`);
  }

  if (issue.start_date) {
    parts.push(`Start date: ${issue.start_date}`);
  }

  if (issue.fixed_version) {
    parts.push(`Version: ${issue.fixed_version.name}`);
  }

  const journalsText = formatJournals(issue.journals, opts);
  if (journalsText) {
    parts.push(journalsText);
  }

  return parts.join('\n');
}
```

Note: `truncateText` is defined later in the same file (function hoisting makes this safe). The duplicate `due_date` push from the original (lines 40-42) is intentionally dropped.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run test/unit/formatters.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Verify no regression in existing tool tests**

Run: `npx vitest run test/unit/tools.test.ts`
Expected: PASS — existing `getIssue`, `listIssues`, `createIssue`, `updateIssue` tests unaffected (they call `formatIssue(issue)` with no journals field → no Comments line; list still truncates via its own regex).

- [ ] **Step 6: Commit**

```bash
git add src/utils/formatters.ts test/unit/formatters.test.ts
git commit -m "$(cat <<'EOF'
feat(formatters): add formatJournals with pagination and note truncation

Extend formatIssue with a FormatIssueOptions object and a new pure
formatJournals function that windows/orders comments and caps note length.
Undefined journals render nothing (preserves list/create/update output).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Validated schema + `getIssue` handler with comment controls

**Files:**
- Modify: `src/utils/validators.ts` (add `getIssueSchema` after the issue validators block)
- Modify: `src/tools/issues.ts:104-150` (tool schema + handler) and imports (line 3)
- Test: `test/unit/tools.test.ts:140-188` (extend existing `describe('getIssue')`)

**Interfaces:**
- Consumes: `formatIssue` + `FormatIssueOptions` (Task 1), `validateInput`, `positiveIntegerSchema` from `../utils/validators.js`, `redmineClient.getIssue(id, include)`.
- Produces:
  ```ts
  // validators.ts
  export const getIssueSchema: z.ZodType<{
    id: number;
    include_journals?: boolean;
    journals_limit: number;
    journals_offset: number;
    journals_order: 'asc' | 'desc';
    description_max_chars?: number;
    journal_notes_max_chars: number;
    include?: string[];
  }>;
  // issues.ts (local, not exported)
  function buildInclude(userInclude?: string[]): { include: string[]; journalsRequested: boolean };
  ```
  Bridge precedence in the handler: `const includeJournals = params.include_journals ?? journalsRequested;`
  (`include_journals` has NO zod default, so an explicit `false` is preserved and wins; omitted → inferred from the `include` array; neither → `false`.)

- [ ] **Step 1: Write the failing tests**

Append inside the existing `describe('getIssue', () => { ... })` block in `test/unit/tools.test.ts` (before its closing `});` at line 188):

```ts
    it('does not render comments by default, but shows the count', async () => {
      const mockIssue = {
        issue: {
          id: 200,
          subject: 'Has comments',
          project: { name: 'P' },
          status: { name: 'New' },
          priority: { name: 'Normal' },
          author: { name: 'U' },
          done_ratio: 0,
          journals: [
            { id: 1, user: { id: 1, name: 'A' }, notes: 'first', created_on: '2026-07-01T00:00:00Z', private_notes: false },
            { id: 2, user: { id: 2, name: 'B' }, notes: 'second', created_on: '2026-07-02T00:00:00Z', private_notes: false },
          ],
        },
      };
      vi.mocked(redmineClient.getIssue).mockResolvedValue(mockIssue);

      const result = await getIssue({ id: 200 });

      expect(result.content[0].text).toContain('Comments: 2 total (not shown');
      expect(result.content[0].text).not.toContain('first');
      expect(result.content[0].text).not.toContain('second');
    });

    it('renders comments when include_journals is true', async () => {
      const mockIssue = {
        issue: {
          id: 201, subject: 'S', project: { name: 'P' }, status: { name: 'New' },
          priority: { name: 'Normal' }, author: { name: 'U' }, done_ratio: 0,
          journals: [
            { id: 1, user: { id: 1, name: 'A' }, notes: 'older', created_on: '2026-07-01T00:00:00Z', private_notes: false },
            { id: 2, user: { id: 2, name: 'B' }, notes: 'newer', created_on: '2026-07-02T00:00:00Z', private_notes: false },
          ],
        },
      };
      vi.mocked(redmineClient.getIssue).mockResolvedValue(mockIssue);

      const result = await getIssue({ id: 201, include_journals: true });

      expect(result.content[0].text).toContain('showing 0-1, newest first');
      expect(result.content[0].text).toContain('newer');
      expect(result.content[0].text).toContain('older');
    });

    it('truncates description when description_max_chars is set', async () => {
      const mockIssue = {
        issue: {
          id: 202, subject: 'S', project: { name: 'P' }, status: { name: 'New' },
          priority: { name: 'Normal' }, author: { name: 'U' }, done_ratio: 0,
          description: 'Z'.repeat(1000),
        },
      };
      vi.mocked(redmineClient.getIssue).mockResolvedValue(mockIssue);

      const result = await getIssue({ id: 202, description_max_chars: 50 });

      expect(result.content[0].text).toContain('...');
      expect(result.content[0].text).not.toContain('Z'.repeat(200));
    });

    it('bridges include:[journals] to render comments', async () => {
      const mockIssue = {
        issue: {
          id: 203, subject: 'S', project: { name: 'P' }, status: { name: 'New' },
          priority: { name: 'Normal' }, author: { name: 'U' }, done_ratio: 0,
          journals: [
            { id: 1, user: { id: 1, name: 'A' }, notes: 'bridged', created_on: '2026-07-01T00:00:00Z', private_notes: false },
          ],
        },
      };
      vi.mocked(redmineClient.getIssue).mockResolvedValue(mockIssue);

      const result = await getIssue({ id: 203, include: ['journals'] });

      expect(result.content[0].text).toContain('bridged');
    });

    it('lets explicit include_journals=false override the include bridge', async () => {
      const mockIssue = {
        issue: {
          id: 204, subject: 'S', project: { name: 'P' }, status: { name: 'New' },
          priority: { name: 'Normal' }, author: { name: 'U' }, done_ratio: 0,
          journals: [
            { id: 1, user: { id: 1, name: 'A' }, notes: 'hidden', created_on: '2026-07-01T00:00:00Z', private_notes: false },
          ],
        },
      };
      vi.mocked(redmineClient.getIssue).mockResolvedValue(mockIssue);

      const result = await getIssue({ id: 204, include: ['journals'], include_journals: false });

      expect(result.content[0].text).not.toContain('hidden');
      expect(result.content[0].text).toContain('not shown');
    });

    it('returns an error response when a param is out of range', async () => {
      const result = await getIssue({ id: 205, journals_limit: 999 });
      expect(result.isError).toBe(true);
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run test/unit/tools.test.ts -t getIssue`
Expected: FAIL — new params ignored / no validation yet.

- [ ] **Step 3a: Add the schema to `src/utils/validators.ts`**

Insert after the `issueQuerySchema` definition (search for `export const issueQuerySchema` and add below its closing `});`):

```ts
// Get-issue validator (comment pagination + truncation controls)
export const getIssueSchema = z.object({
  id: positiveIntegerSchema,
  include_journals: z.boolean().optional(), // no default: preserves explicit false for bridge precedence
  journals_limit: z.number().int().min(1).max(100).optional().default(10),
  journals_offset: z.number().int().min(0).optional().default(0),
  journals_order: z.enum(['asc', 'desc']).optional().default('desc'),
  description_max_chars: z.number().int().min(0).optional(),
  journal_notes_max_chars: z.number().int().min(0).optional().default(500),
  include: z.array(z.string()).optional(),
});
```

- [ ] **Step 3b: Rewrite the tool schema + handler in `src/tools/issues.ts`**

Update the import on line 5-11 to add `getIssueSchema`:

```ts
import {
  validateInput,
  parseId,
  createIssueSchema,
  updateIssueSchema,
  issueQuerySchema,
  getIssueSchema,
} from '../utils/validators.js';
```

Replace `getIssueTool` and `getIssue` (lines 104-150) with:

```ts
// Get issue tool
export const getIssueTool: Tool = {
  name: 'redmine_get_issue',
  description:
    'Get a specific issue. Comments (journals) are OFF by default to save tokens; ' +
    'the total count is always shown. Enable and page through comments with the journals_* params.',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Issue ID',
      },
      include_journals: {
        type: 'boolean',
        description: 'Return comment bodies (default false). When false, only the total count is shown.',
      },
      journals_limit: {
        type: 'number',
        description: 'Max comments to return when include_journals=true (1-100, default 10)',
      },
      journals_offset: {
        type: 'number',
        description: 'Comment start index for paging (default 0; with desc order, 0 = newest)',
      },
      journals_order: {
        type: 'string',
        description: '"desc" (newest first, default) or "asc" (oldest first)',
      },
      description_max_chars: {
        type: 'number',
        description: 'Truncate the description to this many chars. Omit or 0 = full text.',
      },
      journal_notes_max_chars: {
        type: 'number',
        description: 'Truncate each comment to this many chars (default 500). 0 = full text.',
      },
      include: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Extra data besides journals: watchers, relations, children, attachments, changesets. ' +
          "Passing 'journals' here also turns comments on unless include_journals is explicitly set.",
      },
    },
    required: ['id'],
  },
};

function buildInclude(userInclude?: string[]): { include: string[]; journalsRequested: boolean } {
  const requested = userInclude ?? [];
  const journalsRequested = requested.includes('journals');
  const others = requested.filter((v) => v !== 'journals');
  return { include: ['journals', ...others], journalsRequested };
}

export async function getIssue(input: unknown) {
  try {
    const params = validateInput(getIssueSchema, input);
    const { include, journalsRequested } = buildInclude(params.include);
    const includeJournals = params.include_journals ?? journalsRequested;

    const response = await redmineClient.getIssue(params.id, include);
    const content = formatIssue(response.issue, {
      descriptionMaxChars: params.description_max_chars,
      includeJournals,
      journalsLimit: params.journals_limit,
      journalsOffset: params.journals_offset,
      journalsOrder: params.journals_order,
      journalNotesMaxChars: params.journal_notes_max_chars,
    });

    return {
      content: [{ type: 'text', text: content }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}
```

Note: `parseId` is no longer used by `getIssue` (schema validates `id`), but it is still used by other handlers in this file — leave the import.

- [ ] **Step 4: Run the getIssue tests to verify they pass**

Run: `npx vitest run test/unit/tools.test.ts -t getIssue`
Expected: PASS — including the two pre-existing tests (`should get issue details` still asserts client called with `(123, ['journals'])`; `should include additional data when requested` still asserts `(123, ['journals', 'attachments'])`).

- [ ] **Step 5: Run the full suite + build**

Run: `npx vitest run`
Expected: PASS, coverage ≥ 80%.

Run: `npm run build`
Expected: `tsc` exits clean, no type errors. (If `tsc` is missing, run `npm ci` first.)

- [ ] **Step 6: Commit**

```bash
git add src/utils/validators.ts src/tools/issues.ts test/unit/tools.test.ts
git commit -m "$(cat <<'EOF'
feat(get_issue): comments opt-in, paginated, and validated

redmine_get_issue no longer force-dumps every comment. journals are OFF by
default (count still shown), with journals_limit/offset/order paging,
description_max_chars, and journal_notes_max_chars caps. Adds a getIssueSchema
for input validation. include:['journals'] bridges to on unless include_journals
is explicitly set.

BREAKING: comments are no longer returned unless include_journals=true (or
include contains 'journals').

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Document the new parameters and breaking change

**Files:**
- Modify: `README.md` (tools table / get_issue entry)
- Modify: `docs/API.md` (get_issue section)

**Interfaces:**
- Consumes: final param list from Task 2.
- Produces: no code.

- [ ] **Step 1: Locate the get_issue docs**

Run: `grep -rn "redmine_get_issue\|get_issue" README.md docs/API.md`
Expected: one or more references to update.

- [ ] **Step 2: Update the docs**

In `README.md` and `docs/API.md`, update the `redmine_get_issue` description to state: comments are OFF by default (only the count is shown); enable with `include_journals=true`; page with `journals_limit` / `journals_offset` / `journals_order`; cap text with `description_max_chars` / `journal_notes_max_chars` (0 = unlimited). Add a short **Breaking change** note: previously all comments were always returned.

Concrete snippet to insert under the get_issue docs (adapt heading level to the file):

```markdown
**`redmine_get_issue`** — Get one issue.

- `id` (number, required)
- `include_journals` (boolean, default `false`) — return comment bodies. When false, only the comment count is shown.
- `journals_limit` (number, 1–100, default 10), `journals_offset` (number, default 0), `journals_order` (`"desc"` default | `"asc"`)
- `description_max_chars` (number, `0`/omit = full), `journal_notes_max_chars` (number, default 500, `0` = full)
- `include` (string[]) — `watchers`, `relations`, `children`, `attachments`, `changesets`. Listing `journals` here also enables comments unless `include_journals` is set.

> **Breaking change:** comments are no longer returned by default. Pass `include_journals=true` (or `include: ["journals"]`).
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/API.md
git commit -m "$(cat <<'EOF'
docs: document get_issue comment pagination params and breaking change

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**1. Spec coverage:**
- comments opt-in (default OFF) → Task 2 handler (`includeJournals` default false) + Task 1 formatter. ✓
- always show count → Task 1 `formatJournals` count meta. ✓
- offset/limit/order pagination → Task 1 + Task 2 params. ✓
- description/note truncation with 0=unlimited → Task 1 (`descriptionMaxChars`, `journalNotesMaxChars`). ✓
- drill-down escape hatch marker → Task 1 truncation marker test. ✓
- input validation (getIssueSchema) → Task 2 Step 3a + out-of-range test. ✓
- bridge precedence (explicit include_journals > include-array > false) → Task 2 handler `?? ` + two tests. ✓
- total counts note-bearing only → Task 1 "counts only note-bearing" test. ✓
- backward-safe for list/create/update (undefined journals → no line) → Task 1 undefined test + Task 1 Step 5 regression run. ✓
- docs/breaking-change note → Task 3. ✓

**2. Placeholder scan:** No TBD/TODO; every code step has full code; every test has assertions. ✓

**3. Type consistency:** `FormatIssueOptions` field names (`descriptionMaxChars`, `includeJournals`, `journalsLimit`, `journalsOffset`, `journalsOrder`, `journalNotesMaxChars`) are identical in Task 1's interface, Task 1's `formatIssue`/`formatJournals` bodies, and Task 2's handler mapping. Schema snake_case params (`include_journals`, `journals_limit`, `journals_offset`, `journals_order`, `description_max_chars`, `journal_notes_max_chars`) match between Task 2 schema, tool inputSchema, and tests. `buildInclude` returns `{ include, journalsRequested }` used verbatim in the handler. ✓

**Deviation from spec (noted):** Spec §5 suggested `formatIssue` opts default `includeJournals=true` for backward safety. The plan instead makes `formatJournals` return `''` for `journals === undefined`, which preserves list/create/update output more precisely and lets the default be `false`. Same outcome, cleaner.
