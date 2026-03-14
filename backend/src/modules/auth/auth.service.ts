import prisma from '@/config/database';
import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
} from '@/shared/utils/auth';
import { generateTemporaryPassword } from '@/shared/utils/password';
import { sendEmail } from '@/shared/services/email.service';
import {
  ConflictError,
  UnauthorizedError,
  NotFoundError,
} from '@/shared/utils/errors';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.validation';

export class AuthService {
  /**
   * Register a new user
   */
  async register(data: RegisterInput) {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Generate and hash a temporary password. User must reset on first login.
    const temporaryPassword = generateTemporaryPassword();
    const passwordHash = await hashPassword(temporaryPassword);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        firstLoginRequired: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        firstLoginRequired: true,
        createdAt: true,
      },
    });

    // Send temp password via email. In dev/no SMTP config, this logs instead.
    console.log('[auth] User created, about to send email to:', user.email);
    const emailResult = await sendEmail({
      to: user.email,
      subject: 'Your temporary password',
      text: [
        `Hi ${user.name},`,
        '',
        'Your account has been created. Use the temporary password below to sign in:',
        '',
        temporaryPassword,
        '',
        'You will be required to reset your password after your first login.',
      ].join('\n'),
    });

    console.log('[auth] Email result:', emailResult);
    if (!emailResult.delivered) {
      console.warn(`[auth] Failed to send verification email to ${user.email} - SMTP not configured or delivery failed`);
    }

    return {
      user,
    };
  }

  /**
   * Login user
   */
  async login(data: LoginInput) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await verifyPassword(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Get user's organization (if any)
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      organizationId: orgMember?.organizationId,
      role: orgMember?.role,
    });

    const refreshToken = generateRefreshToken({
      sub: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        firstLoginRequired: user.firstLoginRequired,
      },
      organization: orgMember?.organization,
      role: orgMember?.role,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const { verifyRefreshToken } = await import('@/shared/utils/auth');
      const payload = verifyRefreshToken(refreshToken);

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      // Get current organization
      const orgMember = await prisma.organizationMember.findFirst({
        where: { userId: user.id },
      });

      // Generate new access token
      const newAccessToken = generateAccessToken({
        sub: user.id,
        email: user.email,
        organizationId: orgMember?.organizationId,
        role: orgMember?.role,
      });

      return {
        accessToken: newAccessToken,
      };
    } catch (error) {
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        emailVerified: true,
        firstLoginRequired: true,
        createdAt: true,
        organizationMembers: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Change password for the currently authenticated user.
   *
   * This clears the `firstLoginRequired` flag and returns fresh tokens so the
   * client can continue seamlessly without logging in again.
   */
  async changePassword(userId: string, data: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isPasswordValid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        firstLoginRequired: false,
      },
    });

    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: true },
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      organizationId: orgMember?.organizationId,
      role: orgMember?.role,
    });

    const refreshToken = generateRefreshToken({
      sub: user.id,
      email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        firstLoginRequired: false,
      },
      organization: orgMember?.organization,
      role: orgMember?.role,
      accessToken,
      refreshToken,
    };
  }
}
