import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const logsDir = process.env.LOGS_DIR ? path.resolve(process.env.LOGS_DIR) : path.join(process.cwd(), 'logs');

export const logger = (req: Request, res: Response, next: NextFunction) => {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const logFilePath = path.join(logsDir, `${dateStr}.log`);

  // Ensure the logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = now.toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';

  let logEntry = `${timestamp} - ${method} ${url} - Browser: ${userAgent}\n`;

  // Log headers in table format
  logEntry += 'Headers:\n';
  for (let i = 0; i < req.rawHeaders.length; i += 2) {
    const key = req.rawHeaders[i];
    const value = req.rawHeaders[i + 1] || '';
    logEntry += `${key}: ${value}\n`;
  }
  logEntry += '\n';

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });

  next();
};