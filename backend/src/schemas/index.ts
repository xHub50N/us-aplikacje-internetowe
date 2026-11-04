import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100, 'Name must not exceed 100 characters'),
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  password: z.string().min(6, 'Password must be at least 6 characters long').max(128, 'Password must not exceed 128 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().min(1, 'Refresh token is required'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().trim().optional(),
});

export const numericIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'ID must be a positive integer')
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, 'ID must be a positive integer'),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(255, 'Project name must not exceed 255 characters'),
  description: z.string().trim().max(1000, 'Description must not exceed 1000 characters').nullable().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name cannot be empty').max(255, 'Project name must not exceed 255 characters').optional(),
  description: z.string().trim().max(1000, 'Description must not exceed 1000 characters').nullable().optional(),
});

export const projectRoleEnum = z.enum(['OWNER', 'MEMBER']);

export const addProjectMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('A valid email address is required'),
  role: projectRoleEnum.optional(),
});

export const projectMemberParamsSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'Project ID must be a positive integer')
    .transform((val) => Number(val)),
  userId: z
    .string()
    .regex(/^\d+$/, 'User ID must be a positive integer')
    .transform((val) => Number(val)),
});

export const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title is required').max(255, 'Task title must not exceed 255 characters'),
  description: z.string().trim().max(2000, 'Description must not exceed 2000 characters').nullable().optional(),
  completed: z.boolean().optional(),
  priority: priorityEnum.optional(),
  dueDate: z
    .string()
    .datetime({ message: 'dueDate must be a valid ISO 8601 date-time string' })
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
  projectId: z.number().int().positive('Valid projectId is required'),
  assignedToId: z.number().int().positive('Invalid assignedToId').nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1, 'Task title cannot be empty').max(255, 'Task title must not exceed 255 characters').optional(),
  description: z.string().trim().max(2000, 'Description must not exceed 2000 characters').nullable().optional(),
  completed: z.boolean().optional(),
  priority: priorityEnum.optional(),
  dueDate: z
    .string()
    .datetime({ message: 'dueDate must be a valid ISO 8601 date-time string' })
    .transform((val) => new Date(val))
    .nullable()
    .optional(),
  projectId: z.number().int().positive('Invalid projectId').optional(),
  assignedToId: z.number().int().positive('Invalid assignedToId').nullable().optional(),
});

export const taskQuerySchema = z.object({
  projectId: z
    .string()
    .regex(/^\d+$/, 'Invalid projectId query parameter')
    .transform((val) => Number(val))
    .optional(),
  completed: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  priority: priorityEnum.optional(),
  assignedToId: z
    .string()
    .regex(/^\d+$/, 'Invalid assignedToId query parameter')
    .transform((val) => Number(val))
    .optional(),
  assignedToMe: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  search: z.string().trim().min(1).optional(),
  sortBy: z.enum(['createdAt', 'dueDate', 'title', 'priority']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
