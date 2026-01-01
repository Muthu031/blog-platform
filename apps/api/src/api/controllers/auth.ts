import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // For demo purposes, hardcoded user
  if (email === 'user@example.com' && password === 'password') {
    const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '30m' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
};