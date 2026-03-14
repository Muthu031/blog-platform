import { Request, Response, NextFunction } from 'express';
import prisma from '@/config/database';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/shared/utils/errors';

type TenantContext = {
  id: string;
  slug: string;
  name: string;
};

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      tenantRole?: string;
    }
  }
}

function getHeader(req: Request, name: string) {
  const v = req.headers[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return v;
}

function maybeSubdomain(hostname: string) {
  const host = hostname.split(':')[0].toLowerCase();
  const parts = host.split('.').filter(Boolean);
  // e.g. acme.example.com -> acme
  if (parts.length >= 3) return parts[0];
  return null;
}

function resolveTenantIdentifier(req: Request) {
  // Prefer explicit header-based tenancy in production systems.
  const headerId = getHeader(req, 'x-tenant-id') || getHeader(req, 'x-organization-id');
  const headerSlug = getHeader(req, 'x-tenant-slug') || getHeader(req, 'x-org-slug');
  const hostSlug = req.hostname ? maybeSubdomain(req.hostname) : null;

  // Common route params used by this codebase.
  const paramOrg = req.params.orgId || req.params.organizationId || req.params.id;

  return headerId || headerSlug || hostSlug || paramOrg || null;
}

/**
 * Resolves tenant (organization) from header, domain, or route params.
 * Adds `req.tenant`.
 */
export async function requireTenant(req: Request, _res: Response, next: NextFunction) {
  try {
    const identifier = resolveTenantIdentifier(req);
    if (!identifier) {
      throw new NotFoundError('Tenant not found', 'TENANT_NOT_RESOLVED');
    }

    const tenant = await prisma.organization.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: identifier }, { slug: identifier }],
      },
      select: { id: true, slug: true, name: true },
    });

    if (!tenant) {
      throw new NotFoundError('Tenant not found', 'TENANT_NOT_FOUND');
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Requires the authenticated user to be a member of the resolved tenant.
 * Adds `req.tenantRole`.
 */
export async function requireTenantMember(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Unauthorized');
    }

    if (!req.tenant) {
      // Ensure `requireTenant` runs before this middleware.
      throw new NotFoundError('Tenant not found', 'TENANT_NOT_RESOLVED');
    }

    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: req.tenant.id,
          userId: req.user.sub,
        },
      },
    });

    if (!member) {
      throw new ForbiddenError('Access denied', 'TENANT_ACCESS_DENIED');
    }

    req.tenantRole = member.role;
    next();
  } catch (err) {
    next(err);
  }
}

