import { z } from 'zod';
import { ValidationError } from './errors.js';

// Common validators
export const positiveIntegerSchema = z.number().int().positive();
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');
export const emailSchema = z.string().email();

// Upload schema for file attachments
export const uploadSchema = z.object({
  token: z.string().min(1),
  filename: z.string().optional(),
  description: z.string().optional(),
  content_type: z.string().optional(),
});

// Issue validators
export const createIssueSchema = z.object({
  project_id: positiveIntegerSchema,
  tracker_id: positiveIntegerSchema.optional(),
  status_id: positiveIntegerSchema.optional(),
  priority_id: positiveIntegerSchema.optional(),
  subject: z.string().min(1).max(255),
  description: z.string().optional(),
  category_id: positiveIntegerSchema.optional(),
  fixed_version_id: positiveIntegerSchema.optional(),
  assigned_to_id: positiveIntegerSchema.optional(),
  parent_issue_id: positiveIntegerSchema.optional(),
  start_date: dateSchema.optional(),
  due_date: dateSchema.optional(),
  estimated_hours: z.number().positive().optional(),
  done_ratio: z.number().min(0).max(100).optional(),
  is_private: z.boolean().optional(),
  watcher_user_ids: z.array(positiveIntegerSchema).optional(),
  custom_field_values: z.record(z.string(), z.string()).optional(),
  uploads: z.array(uploadSchema).optional(),
});

export const updateIssueSchema = createIssueSchema.partial().extend({
  notes: z.string().optional(),
  private_notes: z.boolean().optional(),
});

export const issueQuerySchema = z.object({
  project_id: z.union([positiveIntegerSchema, z.string()]).optional(),
  subproject_id: z.string().optional(),
  tracker_id: positiveIntegerSchema.optional(),
  status_id: z.union([positiveIntegerSchema, z.string()]).optional(),
  assigned_to_id: z.union([positiveIntegerSchema, z.string()]).optional(),
  parent_id: positiveIntegerSchema.optional(),
  subject: z.string().optional(),
  created_on: z.string().optional(),
  updated_on: z.string().optional(),
  closed_on: z.string().optional(),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  done_ratio: z.string().optional(),
  is_private: z.boolean().optional(),
  attachment: z.string().optional(),
  category_id: positiveIntegerSchema.optional(),
  fixed_version_id: z.union([positiveIntegerSchema, z.string()]).optional(),
  sort: z.string().optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Time entry validators
const baseTimeEntrySchema = z.object({
  issue_id: positiveIntegerSchema.optional(),
  project_id: positiveIntegerSchema.optional(),
  spent_on: dateSchema.optional(),
  hours: z.number().positive(),
  activity_id: positiveIntegerSchema,
  comments: z.string().max(1024).optional(),
  user_id: positiveIntegerSchema.optional(),
  custom_field_values: z.record(z.string(), z.string()).optional(),
});

export const createTimeEntrySchema = baseTimeEntrySchema.refine(
  (data) => data.issue_id || data.project_id,
  { message: 'Either issue_id or project_id must be provided' }
);

export const updateTimeEntrySchema = baseTimeEntrySchema.partial().refine(
  (data) => data.issue_id || data.project_id,
  { message: 'Either issue_id or project_id must be provided' }
);

export const timeEntryQuerySchema = z.object({
  project_id: z.union([positiveIntegerSchema, z.string()]).optional(),
  issue_id: positiveIntegerSchema.optional(),
  user_id: z.union([positiveIntegerSchema, z.string()]).optional(),
  spent_on: dateSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  activity_id: positiveIntegerSchema.optional(),
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

// Wiki validators
export const wikiPageSchema = z.object({
  text: z.string(),
  comments: z.string().optional(),
  version: positiveIntegerSchema.optional(),
  parent_title: z.string().optional(),
});

// Journal validators
export const updateJournalSchema = z.object({
  notes: z.string().optional(),
  private_notes: z.boolean().optional(),
});

// Attachment validators
export const updateAttachmentSchema = z.object({
  filename: z.string().min(1).optional(),
  description: z.string().optional(),
});

// File validators
export const createFileSchema = z.object({
  token: z.string().min(1),
  version_id: positiveIntegerSchema.optional(),
  filename: z.string().optional(),
  description: z.string().optional(),
});

// Upload validators
export const uploadFileSchema = z.object({
  content_base64: z.string().min(1),
  filename: z.string().optional(),
});

// Generic pagination validator
export const paginationSchema = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(25),
});

// Helper function to validate input
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  fieldName?: string
): T {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new ValidationError(messages.join(', '), fieldName);
    }
    throw error;
  }
}

// Helper to parse and validate ID
export function parseId(value: string | number): number {
  if (typeof value === 'number') {
    return positiveIntegerSchema.parse(value);
  }
  
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ValidationError('Invalid ID format', 'id');
  }
  
  return positiveIntegerSchema.parse(parsed);
}