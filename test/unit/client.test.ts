import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { RedmineClient } from '../../src/client/index.js';
import { config } from '../../src/config.js';

// Mock axios - must provide interceptors in the factory since singleton is created at import time
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>;
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
        request: vi.fn(),
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
      })),
    },
  };
});
const mockedAxios = vi.mocked(axios, true);

// Mock config
vi.mock('../../src/config.js', () => ({
  config: {
    redmine: {
      url: 'https://test.redmine.com',
      apiKey: 'test-api-key',
      sslVerify: true,
      requestTimeout: 30000,
      maxRetries: 3,
    },
    logging: {
      level: 'info',
      otelLevel: 'none',
    },
  },
}));

describe('RedmineClient', () => {
  let client: RedmineClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      request: vi.fn(),
      interceptors: {
        request: {
          use: vi.fn(),
        },
        response: {
          use: vi.fn(),
        },
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    client = new RedmineClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://test.redmine.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Redmine-API-Key': 'test-api-key',
        },
      });
    });

    it('should setup retry interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('listProjects', () => {
    it('should fetch projects list', async () => {
      const mockResponse = {
        data: {
          projects: [
            { id: 1, name: 'Project 1' },
            { id: 2, name: 'Project 2' },
          ],
          total_count: 2,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.listProjects({ limit: 10, offset: 0 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects.json', {
        params: { limit: 10, offset: 0 },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getProject', () => {
    it('should fetch project details', async () => {
      const mockResponse = {
        data: {
          project: {
            id: 1,
            name: 'Test Project',
            identifier: 'test-project',
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getProject(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/1.json', {
        params: undefined,
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should include additional data when requested', async () => {
      const mockResponse = {
        data: {
          project: {
            id: 1,
            name: 'Test Project',
            trackers: [{ id: 1, name: 'Bug' }],
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getProject(1, ['trackers']);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/1.json', {
        params: { include: 'trackers' },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listIssues', () => {
    it('should fetch issues with query parameters', async () => {
      const mockResponse = {
        data: {
          issues: [
            { id: 1, subject: 'Issue 1' },
            { id: 2, subject: 'Issue 2' },
          ],
          total_count: 2,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const query = {
        project_id: 1,
        status_id: 'open',
        limit: 25,
      };

      const result = await client.listIssues(query);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/issues.json', {
        params: query,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createIssue', () => {
    it('should create a new issue', async () => {
      const mockResponse = {
        data: {
          issue: {
            id: 123,
            subject: 'New Issue',
            project: { id: 1, name: 'Test Project' },
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const issueData = {
        project_id: 1,
        subject: 'New Issue',
        description: 'Issue description',
      };

      const result = await client.createIssue(issueData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/issues.json', {
        issue: issueData,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateIssue', () => {
    it('should update an existing issue', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      const updateData = {
        subject: 'Updated Subject',
        done_ratio: 50,
      };

      await client.updateIssue(123, updateData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/issues/123.json', {
        issue: updateData,
      });
    });
  });

  describe('deleteIssue', () => {
    it('should delete an issue', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.deleteIssue(123);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/issues/123.json');
    });
  });

  describe('listTimeEntries', () => {
    it('should fetch time entries', async () => {
      const mockResponse = {
        data: {
          time_entries: [
            { id: 1, hours: 2.5, activity: { id: 9, name: 'Development' } },
          ],
          total_count: 1,
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const query = {
        user_id: 'me',
        from: '2024-01-01',
        to: '2024-01-31',
      };

      const result = await client.listTimeEntries(query);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/time_entries.json', {
        params: query,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createTimeEntry', () => {
    it('should create a time entry', async () => {
      const mockResponse = {
        data: {
          time_entry: {
            id: 456,
            hours: 3,
            spent_on: '2024-01-15',
          },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const entryData = {
        issue_id: 123,
        hours: 3,
        activity_id: 9,
        comments: 'Worked on feature',
      };

      const result = await client.createTimeEntry(entryData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/time_entries.json', {
        time_entry: entryData,
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user info', async () => {
      const mockResponse = {
        data: {
          user: {
            id: 1,
            login: 'testuser',
            firstname: 'Test',
            lastname: 'User',
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getCurrentUser();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/users/current.json');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('listWikiPages', () => {
    it('should fetch wiki pages for a project', async () => {
      const mockResponse = {
        data: {
          wiki_pages: [
            { title: 'Home', version: 1 },
            { title: 'Documentation', version: 3 },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.listWikiPages('test-project');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/projects/test-project/wiki/index.json'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('getWikiPage', () => {
    it('should fetch wiki page content', async () => {
      const mockResponse = {
        data: {
          wiki_page: {
            title: 'Home',
            text: '# Welcome\n\nThis is the home page.',
            version: 1,
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getWikiPage('test-project', 'Home');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/projects/test-project/wiki/Home.json'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch specific version of wiki page', async () => {
      const mockResponse = {
        data: {
          wiki_page: {
            title: 'Home',
            text: 'Old version content',
            version: 2,
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getWikiPage('test-project', 'Home', 2);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/projects/test-project/wiki/Home/2.json'
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateJournal', () => {
    it('should update a journal', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: {} });

      await client.updateJournal(10, { notes: 'Updated note', private_notes: true });

      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/journals/10.json', {
        journal: { notes: 'Updated note', private_notes: true },
      });
    });
  });

  describe('getAttachment', () => {
    it('should fetch attachment details', async () => {
      const mockResponse = {
        data: {
          attachment: {
            id: 1,
            filename: 'test.txt',
            filesize: 1024,
            content_url: 'https://redmine.example.com/attachments/download/1/test.txt',
            author: { id: 1, name: 'John' },
            created_on: '2024-01-15',
          },
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.getAttachment(1);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/attachments/1.json');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateAttachment', () => {
    it('should update an attachment via PATCH', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: {} });

      await client.updateAttachment(1, { filename: 'renamed.txt', description: 'Updated' });

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/attachments/1.json', {
        attachment: { filename: 'renamed.txt', description: 'Updated' },
      });
    });
  });

  describe('deleteAttachment', () => {
    it('should delete an attachment', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.deleteAttachment(1);

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/attachments/1.json');
    });
  });

  describe('listFiles', () => {
    it('should fetch project files', async () => {
      const mockResponse = {
        data: {
          files: [
            { id: 1, filename: 'doc.pdf', filesize: 2048 },
          ],
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      const result = await client.listFiles('test-project');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/test-project/files.json');
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('createFile', () => {
    it('should create a file in project', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.createFile('test-project', { token: 'abc123', version_id: 1, filename: 'doc.pdf' });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/projects/test-project/files.json', {
        file: { token: 'abc123', version_id: 1, filename: 'doc.pdf' },
      });
    });
  });

  describe('uploadFile', () => {
    it('should upload file with octet-stream content type', async () => {
      const mockResponse = {
        data: {
          upload: { token: 'upload-token-123' },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const content = Buffer.from('file content');
      const result = await client.uploadFile(content, 'test.txt');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/uploads.json', content, {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="test.txt"',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should upload file without filename', async () => {
      const mockResponse = {
        data: {
          upload: { token: 'upload-token-456' },
        },
      };

      mockAxiosInstance.post.mockResolvedValue(mockResponse);

      const content = Buffer.from('file content');
      const result = await client.uploadFile(content);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/uploads.json', content, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('customRequest', () => {
    it('should make custom API request', async () => {
      const mockResponse = {
        data: {
          custom: 'response',
        },
      };

      mockAxiosInstance.request.mockResolvedValue(mockResponse);

      const result = await client.customRequest(
        'GET',
        '/custom/endpoint.json',
        undefined,
        { param: 'value' }
      );

      expect(mockAxiosInstance.request).toHaveBeenCalledWith({
        method: 'GET',
        url: '/custom/endpoint.json',
        data: undefined,
        params: { param: 'value' },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('error handling', () => {
    it('should setup retry interceptor', async () => {
      // Verify the interceptor was set up
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
      
      // Get the error handler (second argument)
      const errorHandler = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      expect(typeof errorHandler).toBe('function');
      
      // Test that it handles network errors
      const networkError = { code: 'ECONNABORTED', config: { retryCount: 0 } };
      
      // The error handler should be defined
      expect(errorHandler).toBeDefined();
    });

    it('should not retry after max retries', async () => {
      const networkError = new Error('Network error');
      (networkError as any).code = 'ECONNABORTED';

      const interceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      
      const config = { retryCount: 3 }; // Already at max retries
      
      await expect(interceptor({ code: 'ECONNABORTED', config }))
        .rejects.toMatchObject({ code: 'ECONNABORTED' });
    });
  });
});