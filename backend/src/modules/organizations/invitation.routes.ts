import { Router, Request, Response } from 'express';
import { ZodError } from 'zod';
import { authenticate } from '@/shared/middleware/auth.middleware';
import { invitationService } from './invitation.service';
import { organizationService } from './organization.service';
import { createInvitationSchema } from './organization.validation';
import prisma from '@/config/database';

const router = Router();

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

// POST /api/invitations/:token/accept - Accept invitation
router.post(
  '/:token/accept',
  authenticate,
  async (req: Request, res: Response): Promise<any> => {
    try {
      const result = await invitationService.acceptInvitation(
        req.params.token,
        req.user!.sub
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Failed to accept invitation',
          statusCode: 400
        }
      });
    }
  }
);

export default router;
