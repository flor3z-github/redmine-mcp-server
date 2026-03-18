import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import https from 'https';
import fs from 'fs';
import { config } from '../config.js';
import { sessionStore } from '../context.js';
import type {
  RedmineUser,
  RedmineProject,
  RedmineIssue,
  TimeEntry,
  WikiPage,
  IssueQuery,
  TimeEntryQuery,
  RedmineResponse,
  IssueStatus,
  IssuePriority,
  Tracker,
  Activity,
  Version,
  Attachment,
  RedmineFile,
  Upload,
} from './types.js';

export class RedmineClient {
  private axios: AxiosInstance;

  constructor() {
    const axiosConfig: AxiosRequestConfig = {
      baseURL: config.redmine.url,
      timeout: config.redmine.requestTimeout,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Set up authentication
    if (config.redmine.apiKey) {
      axiosConfig.headers = axiosConfig.headers || {};
      axiosConfig.headers['X-Redmine-API-Key'] = config.redmine.apiKey;
    } else if (config.redmine.username && config.redmine.password) {
      axiosConfig.auth = {
        username: config.redmine.username,
        password: config.redmine.password,
      };
    }

    // Set up SSL configuration
    if (!config.redmine.sslVerify || config.redmine.caCert) {
      const httpsAgent = new https.Agent({
        rejectUnauthorized: config.redmine.sslVerify,
        ca: config.redmine.caCert ? fs.readFileSync(config.redmine.caCert) : undefined,
      });
      axiosConfig.httpsAgent = httpsAgent;
    }

    this.axios = axios.create(axiosConfig);

    // Add per-session credential override via AsyncLocalStorage
    this.axios.interceptors.request.use((reqConfig: InternalAxiosRequestConfig) => {
      const session = sessionStore.getStore();
      if (session) {
        if (session.redmineApiKey) {
          reqConfig.headers['X-Redmine-API-Key'] = session.redmineApiKey;
        }
        if (session.redmineUsername && session.redminePassword) {
          reqConfig.auth = {
            username: session.redmineUsername,
            password: session.redminePassword,
          };
        }
      }
      return reqConfig;
    });

    // Add retry interceptor
    this.setupRetryInterceptor();
  }

  private setupRetryInterceptor(): void {
    if (!this.axios) return; // axios 인스턴스가 없으면 아무 작업도 하지 않음
    this.axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const { config: requestConfig } = error;
        
        if (!requestConfig || !requestConfig.retryCount) {
          requestConfig.retryCount = 0;
        }

        if (requestConfig.retryCount >= config.redmine.maxRetries) {
          return Promise.reject(error);
        }

        // Retry on network errors or 5xx status codes
        if (
          error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          (error.response && error.response.status >= 500)
        ) {
          requestConfig.retryCount += 1;
          
          // Exponential backoff
          const delay = Math.pow(2, requestConfig.retryCount) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
          
          return this.axios(requestConfig);
        }

        return Promise.reject(error);
      }
    );
  }

  // Projects
  async listProjects(params?: { offset?: number; limit?: number }): Promise<RedmineResponse<RedmineProject>> {
    const response = await this.axios.get('/projects.json', { params });
    return response.data;
  }

  async getProject(id: number | string, include?: string[]): Promise<{ project: RedmineProject }> {
    const params = include?.length ? { include: include.join(',') } : undefined;
    const response = await this.axios.get(`/projects/${id}.json`, { params });
    return response.data;
  }

  // Issues
  async listIssues(query?: IssueQuery): Promise<RedmineResponse<RedmineIssue>> {
    const response = await this.axios.get('/issues.json', { params: query });
    return response.data;
  }

  async getIssue(id: number, include?: string[]): Promise<{ issue: RedmineIssue }> {
    const params = include?.length ? { include: include.join(',') } : undefined;
    const response = await this.axios.get(`/issues/${id}.json`, { params });
    return response.data;
  }

  async createIssue(issue: Partial<RedmineIssue>): Promise<{ issue: RedmineIssue }> {
    const response = await this.axios.post('/issues.json', { issue });
    return response.data;
  }

  async updateIssue(id: number, issue: Partial<RedmineIssue>): Promise<void> {
    await this.axios.put(`/issues/${id}.json`, { issue });
  }

  async deleteIssue(id: number): Promise<void> {
    await this.axios.delete(`/issues/${id}.json`);
  }

  // Time Entries
  async listTimeEntries(query?: TimeEntryQuery): Promise<RedmineResponse<TimeEntry>> {
    const response = await this.axios.get('/time_entries.json', { params: query });
    return response.data;
  }

  async getTimeEntry(id: number): Promise<{ time_entry: TimeEntry }> {
    const response = await this.axios.get(`/time_entries/${id}.json`);
    return response.data;
  }

  async createTimeEntry(timeEntry: Partial<TimeEntry>): Promise<{ time_entry: TimeEntry }> {
    const response = await this.axios.post('/time_entries.json', { time_entry: timeEntry });
    return response.data;
  }

  async updateTimeEntry(id: number, timeEntry: Partial<TimeEntry>): Promise<void> {
    await this.axios.put(`/time_entries/${id}.json`, { time_entry: timeEntry });
  }

  async deleteTimeEntry(id: number): Promise<void> {
    await this.axios.delete(`/time_entries/${id}.json`);
  }

  // Users
  async listUsers(params?: { offset?: number; limit?: number; name?: string; group_id?: number }): Promise<RedmineResponse<RedmineUser>> {
    const response = await this.axios.get('/users.json', { params });
    return response.data;
  }

  async getCurrentUser(): Promise<{ user: RedmineUser }> {
    const response = await this.axios.get('/users/current.json');
    return response.data;
  }

  async getUser(id: number, include?: string[]): Promise<{ user: RedmineUser }> {
    const params = include?.length ? { include: include.join(',') } : undefined;
    const response = await this.axios.get(`/users/${id}.json`, { params });
    return response.data;
  }

  // Wiki Pages
  async listWikiPages(projectId: number | string): Promise<{ wiki_pages: WikiPage[] }> {
    const response = await this.axios.get(`/projects/${projectId}/wiki/index.json`);
    return response.data;
  }

  async getWikiPage(projectId: number | string, title: string, version?: number): Promise<{ wiki_page: WikiPage }> {
    const url = version 
      ? `/projects/${projectId}/wiki/${title}/${version}.json`
      : `/projects/${projectId}/wiki/${title}.json`;
    const response = await this.axios.get(url);
    return response.data;
  }

  async createOrUpdateWikiPage(projectId: number | string, title: string, wikiPage: Partial<WikiPage>): Promise<void> {
    await this.axios.put(`/projects/${projectId}/wiki/${title}.json`, { wiki_page: wikiPage });
  }

  async deleteWikiPage(projectId: number | string, title: string): Promise<void> {
    await this.axios.delete(`/projects/${projectId}/wiki/${title}.json`);
  }

  // Enumerations
  async listIssueStatuses(): Promise<{ issue_statuses: IssueStatus[] }> {
    const response = await this.axios.get('/issue_statuses.json');
    return response.data;
  }

  async listIssuePriorities(): Promise<{ issue_priorities: IssuePriority[] }> {
    const response = await this.axios.get('/enumerations/issue_priorities.json');
    return response.data;
  }

  async listTrackers(): Promise<{ trackers: Tracker[] }> {
    const response = await this.axios.get('/trackers.json');
    return response.data;
  }

  async listTimeEntryActivities(): Promise<{ time_entry_activities: Activity[] }> {
    const response = await this.axios.get('/enumerations/time_entry_activities.json');
    return response.data;
  }

  async listVersions(projectId: number | string): Promise<{ versions: Version[] }> {
    const response = await this.axios.get(`/projects/${projectId}/versions.json`);
    return response.data;
  }

  // Journals
  async updateJournal(id: number, data: { notes?: string; private_notes?: boolean }): Promise<void> {
    await this.axios.put(`/journals/${id}.json`, { journal: data });
  }

  // Attachments
  async getAttachment(id: number): Promise<{ attachment: Attachment }> {
    const response = await this.axios.get(`/attachments/${id}.json`);
    return response.data;
  }

  async updateAttachment(id: number, data: { filename?: string; description?: string }): Promise<void> {
    await this.axios.patch(`/attachments/${id}.json`, { attachment: data });
  }

  async deleteAttachment(id: number): Promise<void> {
    await this.axios.delete(`/attachments/${id}.json`);
  }

  // Files
  async listFiles(projectId: number | string): Promise<{ files: RedmineFile[] }> {
    const response = await this.axios.get(`/projects/${projectId}/files.json`);
    return response.data;
  }

  async createFile(projectId: number | string, data: { token: string; version_id?: number; filename?: string; description?: string }): Promise<void> {
    await this.axios.post(`/projects/${projectId}/files.json`, { file: data });
  }

  // Uploads
  async uploadFile(content: Buffer, filename?: string): Promise<{ upload: Upload }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
    };
    if (filename) {
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
    }
    const response = await this.axios.post('/uploads.json', content, { headers });
    return response.data;
  }

  // Custom API Request
  async customRequest(method: string, path: string, data?: unknown, params?: Record<string, unknown>): Promise<unknown> {
    const response = await this.axios.request({
      method,
      url: path,
      data,
      params,
    });
    return response.data;
  }
}

// Export a singleton instance
export const redmineClient = new RedmineClient();