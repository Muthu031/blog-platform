import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { logUtils } from '../../utils/logUtils';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  // For demo purposes, hardcoded user
  if (email === 'user@example.com' && password === 'password') {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '30m' });
    logUtils(req, res, `User ${email} logged in`);
    res.status(200).json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};