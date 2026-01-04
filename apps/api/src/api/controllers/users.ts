import { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import db from '../../services/db';
import { users } from '../../database/tables/users';
import { AuthRequest } from '../middlewares/auth';

export const getUserDetails = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const user = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};