import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  listIssues, 
  getIssue, 
  createIssue, 
  updateIssue,
  deleteIssue 
} from '../../src/tools/issues.js';
import { 
  listProjects, 
  getProject,
  getProjectVersions 
} from '../../src/tools/projects.js';
import { 
  listUsers, 
  getCurrentUser,
  getUser 
} from '../../src/tools/users.js';
import { 
  listTimeEntries,
  createTimeEntry,
  listTimeEntryActivities 
} from '../../src/tools/time-entries.js';
import { 
  listWikiPages,
  getWikiPage,
  createOrUpdateWikiPage,
  deleteWikiPage 
} from '../../src/tools/wiki.js';
import { updateJournal } from '../../src/tools/journals.js';
import {
  getAttachment,
  updateAttachment,
  deleteAttachment,
} from '../../src/tools/attachments.js';
import {
  listFiles,
  createFile,
  uploadFile,
} from '../../src/tools/files.js';
import { redmineClient } from '../../src/client/index.js';

// Mock the client
vi.mock('../../src/client/index.js', () => ({
  redmineClient: {
    listIssues: vi.fn(),
    getIssue: vi.fn(),
    createIssue: vi.fn(),
    updateIssue: vi.fn(),
    deleteIssue: vi.fn(),
    listProjects: vi.fn(),
    getProject: vi.fn(),
    listVersions: vi.fn(),
    listUsers: vi.fn(),
    getCurrentUser: vi.fn(),
    getUser: vi.fn(),
    listTimeEntries: vi.fn(),
    getTimeEntry: vi.fn(),
    createTimeEntry: vi.fn(),
    updateTimeEntry: vi.fn(),
    deleteTimeEntry: vi.fn(),
    listTimeEntryActivities: vi.fn(),
    listWikiPages: vi.fn(),
    getWikiPage: vi.fn(),
    createOrUpdateWikiPage: vi.fn(),
    deleteWikiPage: vi.fn(),
    listIssueStatuses: vi.fn(),
    listIssuePriorities: vi.fn(),
    listTrackers: vi.fn(),
    customRequest: vi.fn(),
    updateJournal: vi.fn(),
    getAttachment: vi.fn(),
    updateAttachment: vi.fn(),
    deleteAttachment: vi.fn(),
    listFiles: vi.fn(),
    createFile: vi.fn(),
    uploadFile: vi.fn(),
  },
}));

describe('Issue Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listIssues', () => {
    it('should list issues with formatting', async () => {
      const mockIssues = {
        issues: [
          {
            id: 1,
            subject: 'Test Issue',
            project: { name: 'Test Project' },
            status: { name: 'New' },
            priority: { name: 'Normal' },
            author: { name: 'John Doe' },
            done_ratio: 0,
          },
        ],
        total_count: 1,
      };

      vi.mocked(redmineClient.listIssues).mockResolvedValue(mockIssues);

      const result = await listIssues({ project_id: 'test', limit: 25 });

      expect(redmineClient.listIssues).toHaveBeenCalledWith({
        project_id: 'test',
        limit: 25,
      });
      expect(result.content[0].text).toContain('Found 1 issue(s)');
      expect(result.content[0].text).toContain('#1 - Test Issue');
      expect(result.content[0].text).toContain('Project: Test Project');
    });

    it('should handle empty results', async () => {
      vi.mocked(redmineClient.listIssues).mockResolvedValue({
        issues: [],
        total_count: 0,
      });

      const result = await listIssues({});

      expect(result.content[0].text).toContain('No issues found');
    });

    it('should handle errors', async () => {
      vi.mocked(redmineClient.listIssues).mockRejectedValue(
        new Error('API Error')
      );

      const result = await listIssues({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: API Error');
    });
  });

  describe('getIssue', () => {
    it('should get issue details', async () => {
      const mockIssue = {
        issue: {
          id: 123,
          subject: 'Detailed Issue',
          project: { name: 'Test Project' },
          status: { name: 'In Progress' },
          priority: { name: 'High' },
          author: { name: 'Jane Doe' },
          assigned_to: { name: 'John Smith' },
          done_ratio: 50,
          description: 'This is a detailed description',
        },
      };

      vi.mocked(redmineClient.getIssue).mockResolvedValue(mockIssue);

      const result = await getIssue({ id: 123 });

      expect(redmineClient.getIssue).toHaveBeenCalledWith(123, ['journals']);
      expect(result.content[0].text).toContain('#123 - Detailed Issue');
      expect(result.content[0].text).toContain('Assigned to: John Smith');
      expect(result.content[0].text).toContain('Progress: 50%');
    });

    it('should include additional data when requested', async () => {
      const mockIssue = {
        issue: {
          id: 123,
          subject: 'Issue with journals',
          project: { name: 'Test' },
          status: { name: 'New' },
          priority: { name: 'Normal' },
          author: { name: 'User' },
          done_ratio: 0,
        },
      };

      vi.mocked(redmineClient.getIssue).mockResolvedValue(mockIssue);

      await getIssue({ id: 123, include: ['journals', 'attachments'] });

      expect(redmineClient.getIssue).toHaveBeenCalledWith(
        123,
        ['journals', 'attachments']
      );
    });
  });

  describe('createIssue', () => {
    it('should create an issue', async () => {
      const newIssue = {
        issue: {
          id: 456,
          subject: 'New Issue',
          project: { name: 'Test' },
          status: { name: 'New' },
          priority: { name: 'Normal' },
          author: { name: 'Creator' },
          done_ratio: 0,
        },
      };

      vi.mocked(redmineClient.createIssue).mockResolvedValue(newIssue);

      const result = await createIssue({
        project_id: 1,
        subject: 'New Issue',
        description: 'Description',
      });

      expect(redmineClient.createIssue).toHaveBeenCalledWith({
        project_id: 1,
        subject: 'New Issue',
        description: 'Description',
      });
      expect(result.content[0].text).toContain('Issue created successfully!');
      expect(result.content[0].text).toContain('#456 - New Issue');
    });

    it('should validate required fields', async () => {
      const result = await createIssue({
        subject: 'Missing project_id',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });
  });

  describe('updateIssue', () => {
    it('should update an issue and fetch updated data', async () => {
      vi.mocked(redmineClient.updateIssue).mockResolvedValue(undefined);
      vi.mocked(redmineClient.getIssue).mockResolvedValue({
        issue: {
          id: 123,
          subject: 'Updated Issue',
          project: { name: 'Test' },
          status: { name: 'Closed' },
          priority: { name: 'High' },
          author: { name: 'User' },
          done_ratio: 100,
        },
      });

      const result = await updateIssue({
        id: 123,
        status_id: 5,
        done_ratio: 100,
        notes: 'Closing issue',
      });

      expect(redmineClient.updateIssue).toHaveBeenCalledWith(123, {
        status_id: 5,
        done_ratio: 100,
        notes: 'Closing issue',
      });
      expect(result.content[0].text).toContain('Issue updated successfully!');
      expect(result.content[0].text).toContain('Status: Closed');
    });
  });

  describe('deleteIssue', () => {
    it('should delete an issue', async () => {
      vi.mocked(redmineClient.deleteIssue).mockResolvedValue(undefined);

      const result = await deleteIssue({ id: 123 });

      expect(redmineClient.deleteIssue).toHaveBeenCalledWith(123);
      expect(result.content[0].text).toContain('Issue #123 deleted successfully');
    });
  });
});

describe('Project Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listProjects', () => {
    it('should list projects', async () => {
      const mockProjects = {
        projects: [
          {
            id: 1,
            name: 'Project Alpha',
            identifier: 'project-alpha',
            status: 1,
            is_public: true,
          },
          {
            id: 2,
            name: 'Project Beta',
            identifier: 'project-beta',
            status: 1,
            is_public: false,
            description: 'Internal project',
          },
        ],
        total_count: 2,
      };

      vi.mocked(redmineClient.listProjects).mockResolvedValue(mockProjects);

      const result = await listProjects({ limit: 10 });

      expect(result.content[0].text).toContain('Found 2 project(s)');
      expect(result.content[0].text).toContain('Project Alpha (project-alpha)');
      expect(result.content[0].text).toContain('Public: Yes');
      expect(result.content[0].text).toContain('Internal project');
    });
  });

  describe('getProject', () => {
    it('should get project details with includes', async () => {
      const mockProject = {
        project: {
          id: 1,
          name: 'Detailed Project',
          identifier: 'detailed',
          status: 1,
          is_public: true,
          trackers: [
            { id: 1, name: 'Bug' },
            { id: 2, name: 'Feature' },
          ],
          issue_categories: [
            { id: 1, name: 'Frontend', assigned_to: { name: 'John' } },
          ],
        },
      };

      vi.mocked(redmineClient.getProject).mockResolvedValue(mockProject);

      const result = await getProject({
        id: 'detailed',
        include: ['trackers', 'issue_categories'],
      });

      expect(redmineClient.getProject).toHaveBeenCalledWith(
        'detailed',
        ['trackers', 'issue_categories']
      );
      expect(result.content[0].text).toContain('Detailed Project (detailed)');
      expect(result.content[0].text).toContain('Trackers:');
      expect(result.content[0].text).toContain('- Bug (ID: 1)');
      expect(result.content[0].text).toContain('Frontend (ID: 1) - Assigned to: John');
    });
  });

  describe('getProjectVersions', () => {
    it('should list project versions', async () => {
      const mockVersions = {
        versions: [
          {
            id: 1,
            project: { id: 1, name: 'Test' },
            name: '1.0',
            status: 'open',
            due_date: '2024-06-30',
            description: 'First release',
          },
          {
            id: 2,
            project: { id: 1, name: 'Test' },
            name: '2.0',
            status: 'locked',
          },
        ],
      };

      vi.mocked(redmineClient.listVersions).mockResolvedValue(mockVersions);

      const result = await getProjectVersions({ project_id: 'test' });

      expect(redmineClient.listVersions).toHaveBeenCalledWith('test');
      expect(result.content[0].text).toContain('Found 2 version(s)');
      expect(result.content[0].text).toContain('Version: 1.0 (ID: 1)');
      expect(result.content[0].text).toContain('Due date: 2024-06-30');
      expect(result.content[0].text).toContain('Description: First release');
    });
  });
});

describe('User Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listUsers', () => {
    it('should list users with filter', async () => {
      const mockUsers = {
        users: [
          {
            id: 1,
            login: 'johndoe',
            firstname: 'John',
            lastname: 'Doe',
            mail: 'john@example.com',
            admin: false,
          },
          {
            id: 2,
            login: 'admin',
            firstname: 'Admin',
            lastname: 'User',
            admin: true,
          },
        ],
        total_count: 2,
      };

      vi.mocked(redmineClient.listUsers).mockResolvedValue(mockUsers);

      const result = await listUsers({ name: 'john' });

      expect(redmineClient.listUsers).toHaveBeenCalledWith({
        name: 'john',
        offset: 0,
        limit: 25,
      });
      expect(result.content[0].text).toContain('Found 2 user(s) matching "john"');
      expect(result.content[0].text).toContain('John Doe (johndoe)');
      expect(result.content[0].text).toContain('Email: john@example.com');
      expect(result.content[0].text).toContain('Role: Administrator');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user info', async () => {
      const mockUser = {
        user: {
          id: 1,
          login: 'current',
          firstname: 'Current',
          lastname: 'User',
          mail: 'current@example.com',
          admin: false,
          last_login_on: '2024-01-15T10:00:00Z',
        },
      };

      vi.mocked(redmineClient.getCurrentUser).mockResolvedValue(mockUser);

      const result = await getCurrentUser({});

      expect(redmineClient.getCurrentUser).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Current User:');
      expect(result.content[0].text).toContain('Current User (current)');
      expect(result.content[0].text).toContain('Last login: 2024-01-15T10:00:00Z');
    });
  });

  describe('getUser', () => {
    it('should get user with memberships', async () => {
      const mockUser = {
        user: {
          id: 1,
          login: 'testuser',
          firstname: 'Test',
          lastname: 'User',
          memberships: [
            {
              project: { name: 'Project A' },
              roles: [{ name: 'Developer' }, { name: 'Reporter' }],
            },
          ],
          groups: [
            { id: 1, name: 'Developers' },
          ],
        },
      };

      vi.mocked(redmineClient.getUser).mockResolvedValue(mockUser as any);

      const result = await getUser({
        id: 1,
        include: ['memberships', 'groups'],
      });

      expect(redmineClient.getUser).toHaveBeenCalledWith(
        1,
        ['memberships', 'groups']
      );
      expect(result.content[0].text).toContain('Memberships:');
      expect(result.content[0].text).toContain('- Project A (Developer, Reporter)');
      expect(result.content[0].text).toContain('Groups:');
      expect(result.content[0].text).toContain('- Developers (ID: 1)');
    });
  });
});

describe('Time Entry Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listTimeEntries', () => {
    it('should list time entries with total hours', async () => {
      const mockEntries = {
        time_entries: [
          {
            id: 1,
            project: { id: 1, name: 'Project A' },
            user: { id: 1, name: 'John Doe' },
            activity: { id: 9, name: 'Development' },
            hours: 2.5,
            spent_on: '2024-01-15',
            comments: 'Working on feature X',
          },
          {
            id: 2,
            project: { id: 1, name: 'Project A' },
            user: { id: 1, name: 'John Doe' },
            activity: { id: 10, name: 'Testing' },
            hours: 1.5,
            spent_on: '2024-01-15',
          },
        ],
        total_count: 2,
      };

      vi.mocked(redmineClient.listTimeEntries).mockResolvedValue(mockEntries);

      const result = await listTimeEntries({
        user_id: 'me',
        from: '2024-01-15',
        to: '2024-01-15',
      });

      expect(result.content[0].text).toContain('Found 2 time entry(ies)');
      expect(result.content[0].text).toContain('Total hours: 4.00');
      expect(result.content[0].text).toContain('Hours: 2.5');
      expect(result.content[0].text).toContain('Activity: Development');
      expect(result.content[0].text).toContain('Comments: Working on feature X');
    });
  });

  describe('createTimeEntry', () => {
    it('should create time entry', async () => {
      const newEntry = {
        time_entry: {
          id: 123,
          project: { id: 1, name: 'Project A' },
          issue: { id: 456 },
          user: { id: 1, name: 'John Doe' },
          activity: { id: 9, name: 'Development' },
          hours: 3,
          spent_on: '2024-01-15',
          comments: 'Implemented login',
        },
      };

      vi.mocked(redmineClient.createTimeEntry).mockResolvedValue(newEntry);

      const result = await createTimeEntry({
        issue_id: 456,
        hours: 3,
        activity_id: 9,
        comments: 'Implemented login',
      });

      expect(result.content[0].text).toContain('Time entry created successfully!');
      expect(result.content[0].text).toContain('Time Entry #123');
      expect(result.content[0].text).toContain('Issue: #456');
    });

    it('should validate required fields', async () => {
      const result = await createTimeEntry({
        hours: 3,
        // Missing activity_id and issue_id/project_id
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });
  });

  describe('listTimeEntryActivities', () => {
    it('should list activities', async () => {
      const mockActivities = {
        time_entry_activities: [
          { id: 9, name: 'Development', is_default: true, active: true },
          { id: 10, name: 'Testing', is_default: false, active: true },
          { id: 11, name: 'Documentation', is_default: false, active: false },
        ],
      };

      vi.mocked(redmineClient.listTimeEntryActivities).mockResolvedValue(mockActivities);

      const result = await listTimeEntryActivities({});

      expect(result.content[0].text).toContain('Available Time Entry Activities:');
      expect(result.content[0].text).toContain('- Development (ID: 9) [DEFAULT]');
      expect(result.content[0].text).toContain('- Documentation (ID: 11) [INACTIVE]');
    });
  });
});

describe('Wiki Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listWikiPages', () => {
    it('should list wiki pages with hierarchy', async () => {
      const mockPages = {
        wiki_pages: [
          { title: 'Home', version: 5 },
          { title: 'Documentation', version: 3 },
          { title: 'API Reference', version: 2, parent: { title: 'Documentation' } },
          { title: 'Installation', version: 1, parent: { title: 'Documentation' } },
        ],
      };

      vi.mocked(redmineClient.listWikiPages).mockResolvedValue(mockPages);

      const result = await listWikiPages({ project_id: 'test' });

      expect(redmineClient.listWikiPages).toHaveBeenCalledWith('test');
      expect(result.content[0].text).toContain('Found 4 wiki page(s)');
      expect(result.content[0].text).toContain('- Home (v5)');
      expect(result.content[0].text).toContain('- Documentation (v3)');
      expect(result.content[0].text).toContain('  - API Reference (v2)');
      expect(result.content[0].text).toContain('  - Installation (v1)');
    });
  });

  describe('getWikiPage', () => {
    it('should get wiki page content', async () => {
      const mockPage = {
        wiki_page: {
          title: 'Home',
          version: 5,
          author: { id: 1, name: 'John Doe' },
          text: '# Welcome\n\nThis is the home page.',
          updated_on: '2024-01-15',
        },
      };

      vi.mocked(redmineClient.getWikiPage).mockResolvedValue(mockPage);

      const result = await getWikiPage({
        project_id: 'test',
        title: 'Home',
      });

      expect(redmineClient.getWikiPage).toHaveBeenCalledWith('test', 'Home', undefined);
      expect(result.content[0].text).toContain('Wiki Page: Home');
      expect(result.content[0].text).toContain('Version: 5');
      expect(result.content[0].text).toContain('Author: John Doe');
      expect(result.content[0].text).toContain('# Welcome');
    });
  });

  describe('createOrUpdateWikiPage', () => {
    it('should create or update wiki page', async () => {
      vi.mocked(redmineClient.createOrUpdateWikiPage).mockResolvedValue(undefined);
      vi.mocked(redmineClient.getWikiPage).mockResolvedValue({
        wiki_page: {
          title: 'NewPage',
          version: 1,
          text: '# New Page Content',
          updated_on: '2024-01-15',
        },
      });

      const result = await createOrUpdateWikiPage({
        project_id: 'test',
        title: 'NewPage',
        text: '# New Page Content',
        comments: 'Initial creation',
      });

      expect(redmineClient.createOrUpdateWikiPage).toHaveBeenCalledWith(
        'test',
        'NewPage',
        {
          text: '# New Page Content',
          comments: 'Initial creation',
        }
      );
      expect(result.content[0].text).toContain('Wiki page saved successfully!');
    });
  });

  describe('deleteWikiPage', () => {
    it('should delete wiki page', async () => {
      vi.mocked(redmineClient.deleteWikiPage).mockResolvedValue(undefined);

      const result = await deleteWikiPage({
        project_id: 'test',
        title: 'OldPage',
      });

      expect(redmineClient.deleteWikiPage).toHaveBeenCalledWith('test', 'OldPage');
      expect(result.content[0].text).toContain('Wiki page "OldPage" deleted successfully');
    });
  });
});

describe('Journal Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('updateJournal', () => {
    it('should update a journal', async () => {
      vi.mocked(redmineClient.updateJournal).mockResolvedValue(undefined);

      const result = await updateJournal({
        id: 10,
        notes: 'Updated comment',
        private_notes: true,
      });

      expect(redmineClient.updateJournal).toHaveBeenCalledWith(10, {
        notes: 'Updated comment',
        private_notes: true,
      });
      expect(result.content[0].text).toContain('Journal #10 updated successfully');
    });

    it('should handle errors', async () => {
      vi.mocked(redmineClient.updateJournal).mockRejectedValue(new Error('Not found'));

      const result = await updateJournal({ id: 999 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error: Not found');
    });
  });
});

describe('Attachment Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getAttachment', () => {
    it('should get attachment details', async () => {
      const mockAttachment = {
        attachment: {
          id: 1,
          filename: 'test.pdf',
          filesize: 2048,
          content_type: 'application/pdf',
          content_url: 'https://redmine.example.com/attachments/download/1/test.pdf',
          author: { id: 1, name: 'John Doe' },
          created_on: '2024-01-15',
          description: 'A test file',
        },
      };

      vi.mocked(redmineClient.getAttachment).mockResolvedValue(mockAttachment);

      const result = await getAttachment({ id: 1 });

      expect(redmineClient.getAttachment).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Attachment #1');
      expect(result.content[0].text).toContain('Filename: test.pdf');
      expect(result.content[0].text).toContain('Size: 2048 bytes');
      expect(result.content[0].text).toContain('Author: John Doe');
      expect(result.content[0].text).toContain('Description: A test file');
    });

    it('should handle errors', async () => {
      vi.mocked(redmineClient.getAttachment).mockRejectedValue(new Error('Not found'));

      const result = await getAttachment({ id: 999 });

      expect(result.isError).toBe(true);
    });
  });

  describe('updateAttachment', () => {
    it('should update an attachment', async () => {
      vi.mocked(redmineClient.updateAttachment).mockResolvedValue(undefined);

      const result = await updateAttachment({
        id: 1,
        filename: 'renamed.pdf',
        description: 'Updated description',
      });

      expect(redmineClient.updateAttachment).toHaveBeenCalledWith(1, {
        filename: 'renamed.pdf',
        description: 'Updated description',
      });
      expect(result.content[0].text).toContain('Attachment #1 updated successfully');
    });
  });

  describe('deleteAttachment', () => {
    it('should delete an attachment', async () => {
      vi.mocked(redmineClient.deleteAttachment).mockResolvedValue(undefined);

      const result = await deleteAttachment({ id: 1 });

      expect(redmineClient.deleteAttachment).toHaveBeenCalledWith(1);
      expect(result.content[0].text).toContain('Attachment #1 deleted successfully');
    });
  });
});

describe('File Tools', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('listFiles', () => {
    it('should list project files', async () => {
      const mockFiles = {
        files: [
          {
            id: 1,
            filename: 'doc.pdf',
            filesize: 4096,
            content_url: 'https://redmine.example.com/attachments/download/1/doc.pdf',
            author: { id: 1, name: 'Jane Doe' },
            created_on: '2024-01-15',
            downloads: 5,
            digest: 'abc123',
          },
        ],
      };

      vi.mocked(redmineClient.listFiles).mockResolvedValue(mockFiles);

      const result = await listFiles({ project_id: 'test-project' });

      expect(redmineClient.listFiles).toHaveBeenCalledWith('test-project');
      expect(result.content[0].text).toContain('Found 1 file(s)');
      expect(result.content[0].text).toContain('File #1');
      expect(result.content[0].text).toContain('Filename: doc.pdf');
      expect(result.content[0].text).toContain('Downloads: 5');
    });

    it('should handle empty results', async () => {
      vi.mocked(redmineClient.listFiles).mockResolvedValue({ files: [] });

      const result = await listFiles({ project_id: 'empty-project' });

      expect(result.content[0].text).toContain('No files found');
    });
  });

  describe('createFile', () => {
    it('should create a file in project', async () => {
      vi.mocked(redmineClient.createFile).mockResolvedValue(undefined);

      const result = await createFile({
        project_id: 'test-project',
        token: 'upload-token-123',
        version_id: 1,
        filename: 'release.zip',
      });

      expect(redmineClient.createFile).toHaveBeenCalledWith('test-project', {
        token: 'upload-token-123',
        version_id: 1,
        filename: 'release.zip',
      });
      expect(result.content[0].text).toContain('File added to project "test-project" successfully');
    });

    it('should validate required token', async () => {
      const result = await createFile({
        project_id: 'test-project',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });
  });

  describe('uploadFile', () => {
    it('should upload file and return token', async () => {
      vi.mocked(redmineClient.uploadFile).mockResolvedValue({
        upload: { token: 'returned-token-789' },
      });

      const base64Content = Buffer.from('test file content').toString('base64');
      const result = await uploadFile({
        content_base64: base64Content,
        filename: 'test.txt',
      });

      expect(redmineClient.uploadFile).toHaveBeenCalledWith(
        Buffer.from(base64Content, 'base64'),
        'test.txt'
      );
      expect(result.content[0].text).toContain('File uploaded successfully');
      expect(result.content[0].text).toContain('Token: returned-token-789');
    });

    it('should validate required content_base64', async () => {
      const result = await uploadFile({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });
  });
});