import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { logUtils } from '../../utils/logUtils';
import { errorHandler } from '../middlewares/errorHandler';
import db from '../../services/db';
import { users } from '../../database/tables/users';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {

     const loggedInUser = await db.select().from(users).where(eq(users.email, email)).limit(1).then(rows => rows[0]);
    if (loggedInUser) {
      const passwordMatch = await bcrypt.compare(password, loggedInUser.passwordHash);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      } 
    }
      const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '30m' });
      logUtils(req, res, `User ${email} logged in`);
      res.status(200).json({ token });
    
  } catch (error) {
    errorHandler(error, req, res);
  }
};

export const signup = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  try {
    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, email));
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert new user
    const newUser = await db.insert(users).values({
      name,
      email,
      passwordHash,
    }).returning({ id: users.id });

    logUtils(req, res, `User ${email} signed up`);
    res.status(201).json({ message: 'User created successfully', user: { id: newUser[0].id, name, email } });
  } catch (error) {
    errorHandler(error, req, res);
  }
};