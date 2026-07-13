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
