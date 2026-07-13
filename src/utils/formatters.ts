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

export function formatProject(project: RedmineProject): string {
  const parts = [
    `${project.name} (${project.identifier})`,
    `ID: ${project.id}`,
    `Status: ${project.status === 1 ? 'Active' : 'Closed'}`,
    `Public: ${project.is_public ? 'Yes' : 'No'}`,
  ];

  if (project.description) {
    parts.push(`\nDescription:\n${project.description}`);
  }

  if (project.parent) {
    parts.push(`Parent: ${project.parent.name}`);
  }

  return parts.join('\n');
}

export function formatUser(user: RedmineUser): string {
  const parts = [
    `${user.firstname} ${user.lastname} (${user.login})`,
    `ID: ${user.id}`,
  ];

  if (user.mail) {
    parts.push(`Email: ${user.mail}`);
  }

  if (user.admin) {
    parts.push('Role: Administrator');
  }

  if (user.last_login_on) {
    parts.push(`Last login: ${user.last_login_on}`);
  }

  return parts.join('\n');
}

export function formatTimeEntry(entry: TimeEntry): string {
  const parts = [
    `Time Entry #${entry.id}`,
    `Hours: ${entry.hours}`,
    `Date: ${entry.spent_on}`,
    `Project: ${entry.project.name}`,
    `Activity: ${entry.activity.name}`,
    `User: ${entry.user.name}`,
  ];

  if (entry.issue) {
    parts.push(`Issue: #${entry.issue.id}`);
  }

  if (entry.comments) {
    parts.push(`Comments: ${entry.comments}`);
  }

  return parts.join('\n');
}

export function formatWikiPage(page: WikiPage): string {
  const parts = [
    `Wiki Page: ${page.title}`,
    `Version: ${page.version}`,
    `Updated: ${page.updated_on}`,
  ];

  if (page.author) {
    parts.push(`Author: ${page.author.name}`);
  }

  if (page.parent) {
    parts.push(`Parent: ${page.parent.title}`);
  }

  if (page.text) {
    parts.push(`\nContent:\n${page.text}`);
  }

  return parts.join('\n');
}

export function formatAttachment(attachment: Attachment): string {
  const parts = [
    `Attachment #${attachment.id}`,
    `Filename: ${attachment.filename}`,
    `Size: ${attachment.filesize} bytes`,
    `URL: ${attachment.content_url}`,
    `Author: ${attachment.author.name}`,
    `Created: ${attachment.created_on}`,
  ];

  if (attachment.content_type) {
    parts.push(`Type: ${attachment.content_type}`);
  }

  if (attachment.description) {
    parts.push(`Description: ${attachment.description}`);
  }

  return parts.join('\n');
}

export function formatFile(file: RedmineFile): string {
  const parts = [
    `File #${file.id}`,
    `Filename: ${file.filename}`,
    `Size: ${file.filesize} bytes`,
    `URL: ${file.content_url}`,
    `Author: ${file.author.name}`,
    `Created: ${file.created_on}`,
    `Downloads: ${file.downloads}`,
    `Digest: ${file.digest}`,
  ];

  if (file.content_type) {
    parts.push(`Type: ${file.content_type}`);
  }

  if (file.description) {
    parts.push(`Description: ${file.description}`);
  }

  if (file.version) {
    parts.push(`Version: ${file.version.name}`);
  }

  return parts.join('\n');
}

export function formatList<T>(
  items: T[],
  formatter: (item: T) => string,
  separator: string = '\n\n'
): string {
  return items.map((item) => formatter(item)).join(separator);
}

export function truncateText(text: string, maxLength: number = 500): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}