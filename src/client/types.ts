// Redmine API Types

export interface RedmineUser {
  id: number;
  login: string;
  admin: boolean;
  firstname: string;
  lastname: string;
  mail?: string;
  created_on: string;
  updated_on: string;
  last_login_on?: string;
  api_key?: string;
  status?: number;
  custom_fields?: CustomField[];
}

export interface RedmineProject {
  id: number;
  name: string;
  identifier: string;
  description?: string;
  homepage?: string;
  status: number;
  is_public: boolean;
  inherit_members?: boolean;
  created_on: string;
  updated_on: string;
  parent?: { id: number; name: string };
  custom_fields?: CustomField[];
  trackers?: Tracker[];
  issue_categories?: IssueCategory[];
  enabled_modules?: EnabledModule[];
}

export interface RedmineIssue {
  id: number;
  project: { id: number; name: string };
  tracker: { id: number; name: string };
  status: { id: number; name: string };
  priority: { id: number; name: string };
  author: { id: number; name: string };
  assigned_to?: { id: number; name: string };
  category?: { id: number; name: string };
  fixed_version?: { id: number; name: string };
  parent?: { id: number };
  subject: string;
  description?: string;
  start_date?: string;
  due_date?: string;
  done_ratio: number;
  is_private: boolean;
  estimated_hours?: number;
  total_estimated_hours?: number;
  spent_hours?: number;
  total_spent_hours?: number;
  custom_fields?: CustomField[];
  created_on: string;
  updated_on: string;
  closed_on?: string;
  journals?: Journal[];
  attachments?: Attachment[];
  relations?: IssueRelation[];
  watchers?: Watcher[];
}

export interface TimeEntry {
  id: number;
  project: { id: number; name: string };
  issue?: { id: number };
  user: { id: number; name: string };
  activity: { id: number; name: string };
  hours: number;
  comments?: string;
  spent_on: string;
  created_on: string;
  updated_on: string;
  custom_fields?: CustomField[];
}

export interface WikiPage {
  title: string;
  parent?: { title: string };
  text?: string;
  version: number;
  author?: { id: number; name: string };
  comments?: string;
  created_on: string;
  updated_on: string;
  attachments?: Attachment[];
}

export interface Tracker {
  id: number;
  name: string;
  default_status?: { id: number; name: string };
  description?: string;
}

export interface IssueStatus {
  id: number;
  name: string;
  is_closed: boolean;
  is_default?: boolean;
}

export interface IssuePriority {
  id: number;
  name: string;
  is_default?: boolean;
  active?: boolean;
}

export interface IssueCategory {
  id: number;
  name: string;
  project?: { id: number; name: string };
  assigned_to?: { id: number; name: string };
}

export interface Version {
  id: number;
  project: { id: number; name: string };
  name: string;
  description?: string;
  status: string;
  due_date?: string;
  sharing: string;
  wiki_page_title?: string;
  created_on: string;
  updated_on: string;
}

export interface CustomField {
  id: number;
  name: string;
  value?: string | string[];
  multiple?: boolean;
}

export interface Journal {
  id: number;
  user: { id: number; name: string };
  notes?: string;
  created_on: string;
  private_notes: boolean;
  details?: JournalDetail[];
}

export interface JournalDetail {
  property: string;
  name: string;
  old_value?: string;
  new_value?: string;
}

export interface Attachment {
  id: number;
  filename: string;
  filesize: number;
  content_type?: string;
  description?: string;
  content_url: string;
  thumbnail_url?: string;
  author: { id: number; name: string };
  created_on: string;
}

export interface RedmineFile {
  id: number;
  filename: string;
  filesize: number;
  content_type?: string;
  description?: string;
  content_url: string;
  thumbnail_url?: string;
  author: { id: number; name: string };
  created_on: string;
  version?: { id: number; name: string };
  digest: string;
  downloads: number;
}

export interface Upload {
  token: string;
}

export interface IssueRelation {
  id: number;
  issue_id: number;
  issue_to_id: number;
  relation_type: string;
  delay?: number;
}

export interface Watcher {
  id: number;
  name: string;
}

export interface EnabledModule {
  id: number;
  name: string;
}

export interface Activity {
  id: number;
  name: string;
  is_default: boolean;
  active?: boolean;
}

// Query interfaces
export interface IssueQuery {
  project_id?: number | string;
  subproject_id?: string;
  tracker_id?: number;
  status_id?: number | string;
  assigned_to_id?: number | string;
  parent_id?: number;
  subject?: string;
  created_on?: string;
  updated_on?: string;
  closed_on?: string;
  start_date?: string;
  due_date?: string;
  done_ratio?: string;
  is_private?: boolean;
  attachment?: string;
  category_id?: number;
  fixed_version_id?: number | string;
  sort?: string;
  offset?: number;
  limit?: number;
  /**
   * cf_1, cf_2 등 Redmine 커스텀 필드 쿼리 파라미터를 위한 동적 키
   */
  [key: string]: string | number | boolean | undefined;
}

export interface TimeEntryQuery {
  project_id?: number | string;
  issue_id?: number;
  user_id?: number | string;
  spent_on?: string;
  from?: string;
  to?: string;
  activity_id?: number;
  offset?: number;
  limit?: number;
}

// Response wrapper interfaces
export interface RedmineResponse<T> {
  [key: string]: T | T[] | number | undefined;
  total_count?: number;
  offset?: number;
  limit?: number;
}

export interface ErrorResponse {
  errors: string[];
}