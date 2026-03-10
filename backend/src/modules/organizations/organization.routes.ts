import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '@/shared/middleware/auth.middleware';
import { organizationService } from './organization.service';
import { invitationService } from './invitation.service';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  updateMemberRoleSchema,
  createInvitationSchema,
  CreateOrganizationInput,
  UpdateOrganizationInput,
  UpdateMemberRoleInput
} from './organization.validation';
import prisma from '@/config/database';

const router = Router();

// POST /api/organizations - Create new organization
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const validatedData = createOrganizationSchema.parse(req.body);

      // Check if slug already exists
      const existing = await prisma.organization.findFirst({
        where: { slug: validatedData.slug, deletedAt: null }
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          error: {
            message: 'Organization slug already exists',
            statusCode: 409
          }
        });
      }

      const organization = await organizationService.createOrganization(req.user!.sub, validatedData);

      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            statusCode: 400,
            issues: error.issues
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

// GET /api/organizations - Get user's organizations
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const organizations = await organizationService.getOrganizationsByUser(req.user!.sub);

      res.json({
        success: true,
        data: organizations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

// GET /api/organizations/:id - Get specific organization
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Check if user has access to this organization
      const access = await organizationService.checkUserOrganizationAccess(
        req.user!.sub,
        req.params.id
      );

      if (!access) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            statusCode: 403
          }
        });
      }

      const organization = await organizationService.getOrganization(req.params.id);

      if (!organization) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Organization not found',
            statusCode: 404
          }
        });
      }

      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

// PUT /api/organizations/:id - Update organization
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Check if user is owner
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: req.params.id,
          userId: req.user!.sub
        }
      });

      if (!member || member.role !== 'owner') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only organization owner can update',
            statusCode: 403
          }
        });
      }

      const validatedData = updateOrganizationSchema.parse(req.body);

      const organization = await organizationService.updateOrganization(
        req.params.id,
        validatedData
      );

      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            statusCode: 400,
            issues: error.issues
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

// DELETE /api/organizations/:id - Delete organization
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Check if user is owner
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: req.params.id,
          userId: req.user!.sub
        }
      });

      if (!member || member.role !== 'owner') {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only organization owner can delete',
            statusCode: 403
          }
        });
      }

      await organizationService.deleteOrganization(req.params.id);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

// PUT /api/organizations/:id/members/:userId/role - Update member role
router.put(
  '/:id/members/:userId/role',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Check if user is admin or owner
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: req.params.id,
          userId: req.user!.sub
        }
      });

      if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only admins and owners can manage members',
            statusCode: 403
          }
        });
      }

      const validatedData = updateMemberRoleSchema.parse(req.body);

      const updatedMember = await prisma.organizationMember.update({
        where: {
          organizationId_userId: {
            organizationId: req.params.id,
            userId: req.params.userId
          }
        },
        data: { role: validatedData.role },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true
            }
          }
        }
      });

      res.json({
        success: true,
        data: updatedMember
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            statusCode: 400,
            issues: error.issues
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

// DELETE /api/organizations/:id/members/:userId - Remove member
router.delete(
  '/:id/members/:userId',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Check if user is admin or owner
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: req.params.id,
          userId: req.user!.sub
        }
      });

      if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only admins and owners can manage members',
            statusCode: 403
          }
        });
      }

      // Prevent removing the last owner
      if (member.role === 'owner' && req.params.userId === member.userId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Cannot remove the last owner from organization',
            statusCode: 400
          }
        });
      }

      await prisma.organizationMember.delete({
        where: {
          organizationId_userId: {
            organizationId: req.params.id,
            userId: req.params.userId
          }
        }
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

// ===== INVITATION ENDPOINTS =====

// POST /api/organizations/:id/invitations - Create invitation
router.post(
  '/:id/invitations',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Check if user is admin or owner
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: req.params.id,
          userId: req.user!.sub
        }
      });

      if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only admins and owners can invite members',
            statusCode: 403
          }
        });
      }

      const validatedData = createInvitationSchema.parse(req.body);

      const invitation = await invitationService.createInvitation(
        req.params.id,
        validatedData.email,
        validatedData.role,
        req.user!.sub
      );

      res.status(201).json({
        success: true,
        data: invitation
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation error',
            statusCode: 400,
            issues: error.issues
          }
        });
      }

      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 400
        }
      });
    }
  }
);

// GET /api/organizations/:id/invitations - Get organization invitations
router.get(
  '/:id/invitations',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Check if user is admin or owner
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: req.params.id,
          userId: req.user!.sub
        }
      });

      if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only admins and owners can view invitations',
            statusCode: 403
          }
        });
      }

      const invitations = await invitationService.getOrganizationInvitations(
        req.params.id
      );

      res.json({
        success: true,
        data: invitations
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

// DELETE /api/organizations/:id/invitations/:invitationId - Revoke invitation
router.delete(
  '/:id/invitations/:invitationId',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      // Check if user is admin or owner
      const member = await prisma.organizationMember.findFirst({
        where: {
          organizationId: req.params.id,
          userId: req.user!.sub
        }
      });

      if (!member || (member.role !== 'admin' && member.role !== 'owner')) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Only admins and owners can revoke invitations',
            statusCode: 403
          }
        });
      }

      await invitationService.revokeInvitation(req.params.invitationId);

      res.status(204).send();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Internal server error',
          statusCode: 500
        }
      });
    }
  }
);

export default router;
