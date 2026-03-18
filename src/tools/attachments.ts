import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { redmineClient } from '../client/index.js';
import { formatAttachment } from '../utils/formatters.js';
import { formatErrorResponse } from '../utils/errors.js';
import { validateInput, parseId, updateAttachmentSchema } from '../utils/validators.js';

// Get attachment tool
export const getAttachmentTool: Tool = {
  name: 'redmine_get_attachment',
  description: 'Get detailed information about a specific attachment',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Attachment ID',
      },
    },
    required: ['id'],
  },
};

export async function getAttachment(input: unknown) {
  try {
    const { id } = input as { id: number };
    const attachmentId = parseId(id);

    const response = await redmineClient.getAttachment(attachmentId);
    const content = formatAttachment(response.attachment);

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

// Update attachment tool
export const updateAttachmentTool: Tool = {
  name: 'redmine_update_attachment',
  description: 'Update an existing attachment (filename or description)',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Attachment ID to update',
      },
      filename: {
        type: 'string',
        description: 'New filename',
      },
      description: {
        type: 'string',
        description: 'New description',
      },
    },
    required: ['id'],
  },
};

export async function updateAttachment(input: unknown) {
  try {
    const { id, ...updateData } = input as { id: number; [key: string]: unknown };
    const attachmentId = parseId(id);
    const validatedData = validateInput(updateAttachmentSchema, updateData);

    await redmineClient.updateAttachment(attachmentId, validatedData);

    return {
      content: [{ type: 'text', text: `Attachment #${attachmentId} updated successfully.` }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}

// Delete attachment tool
export const deleteAttachmentTool: Tool = {
  name: 'redmine_delete_attachment',
  description: 'Delete an attachment from Redmine',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Attachment ID to delete',
      },
    },
    required: ['id'],
  },
};

export async function deleteAttachment(input: unknown) {
  try {
    const { id } = input as { id: number };
    const attachmentId = parseId(id);

    await redmineClient.deleteAttachment(attachmentId);

    return {
      content: [{ type: 'text', text: `Attachment #${attachmentId} deleted successfully.` }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}
