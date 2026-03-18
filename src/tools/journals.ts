import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { redmineClient } from '../client/index.js';
import { formatErrorResponse } from '../utils/errors.js';
import { validateInput, parseId, updateJournalSchema } from '../utils/validators.js';

// Update journal tool
export const updateJournalTool: Tool = {
  name: 'redmine_update_journal',
  description: 'Update an existing journal (comment) on an issue',
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'number',
        description: 'Journal ID to update',
      },
      notes: {
        type: 'string',
        description: 'Updated journal notes/comment (in Markdown format)',
      },
      private_notes: {
        type: 'boolean',
        description: 'Whether the notes are private',
      },
    },
    required: ['id'],
  },
};

export async function updateJournal(input: unknown) {
  try {
    const { id, ...updateData } = input as { id: number; [key: string]: unknown };
    const journalId = parseId(id);
    const validatedData = validateInput(updateJournalSchema, updateData);

    await redmineClient.updateJournal(journalId, validatedData);

    return {
      content: [{ type: 'text', text: `Journal #${journalId} updated successfully.` }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: formatErrorResponse(error) }],
      isError: true,
    };
  }
}
