import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { redmineClient } from '../client/index.js';
import { formatFile, formatList } from '../utils/formatters.js';
import { formatErrorResponse } from '../utils/errors.js';
import { validateInput, createFileSchema, uploadFileSchema } from '../utils/validators.js';

// List files tool
export const listFilesTool: Tool = {
  name: 'redmine_list_files',
  description: 'List files for a specific project',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'Project ID or identifier',
      },
    },
    required: ['project_id'],
  },
};

export async function listFiles(input: unknown) {
  try {
    const { project_id } = input as { project_id: string | number };

    const response = await redmineClient.listFiles(project_id);
    const files = response.files || [];

    let content = `Found ${files.length} file(s)\n\n`;

    if (files.length > 0) {
      content += formatList(files, formatFile);
    } else {
      content += 'No files found for this project.';
    }

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

// Create file tool
export const createFileTool: Tool = {
  name: 'redmine_create_file',
  description: 'Add a previously uploaded file to a project',
  inputSchema: {
    type: 'object',
    properties: {
      project_id: {
        type: 'string',
        description: 'Project ID or identifier',
      },
      token: {
        type: 'string',
        description: 'Upload token returned by redmine_upload_file',
      },
      version_id: {
        type: 'number',
        description: 'Version ID to associate the file with',
      },
      filename: {
        type: 'string',
        description: 'Filename to use',
      },
      description: {
        type: 'string',
        description: 'File description',
      },
    },
    required: ['project_id', 'token'],
  },
};

export async function createFile(input: unknown) {
  try {
    const { project_id, ...fileData } = input as { project_id: string | number; [key: string]: unknown };
    const validatedData = validateInput(createFileSchema, fileData);

    await redmineClient.createFile(project_id, validatedData);

    return {
      content: [{ type: 'text', text: `File added to project "${project_id}" successfully.` }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}

// Upload file tool
export const uploadFileTool: Tool = {
  name: 'redmine_upload_file',
  description: 'Upload a file to Redmine and get an upload token. The token can then be used with redmine_create_file or when creating/updating issues with attachments.',
  inputSchema: {
    type: 'object',
    properties: {
      content_base64: {
        type: 'string',
        description: 'File content encoded as a base64 string',
      },
      filename: {
        type: 'string',
        description: 'Original filename (optional, used in Content-Disposition header)',
      },
    },
    required: ['content_base64'],
  },
};

export async function uploadFile(input: unknown) {
  try {
    const validatedData = validateInput(uploadFileSchema, input);
    const content = Buffer.from(validatedData.content_base64, 'base64');

    const response = await redmineClient.uploadFile(content, validatedData.filename);

    return {
      content: [{
        type: 'text',
        text: `File uploaded successfully!\nToken: ${response.upload.token}\n\nUse this token with redmine_create_file or when creating/updating issues with attachments.`,
      }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}
