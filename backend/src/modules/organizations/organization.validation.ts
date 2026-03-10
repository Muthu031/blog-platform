import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
});

export const updateOrganizationSchema = z.object({
  name: z
    .string()
    .min(1, 'Organization name is required')
    .max(100, 'Organization name must be less than 100 characters')
    .optional()
});

export const updateMemberRoleSchema = z.object({
  role: z
    .enum(['member', 'admin', 'owner'])
});

export const createInvitationSchema = z.object({
  email: z
    .string()
    .email('Invalid email address'),
  role: z
    .enum(['member', 'admin'])
    .optional()
    .default('member')
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
