import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const logsDir = process.env.LOGS_DIR ? path.resolve(process.env.LOGS_DIR) : path.join(process.cwd(), 'error-logs');

/**
 * Error handler middleware function.
 *
 * Logs the error in a structured way to a file
 * in the `error-logs` directory.
 *
 * Responds to the client with a JSON object
 * containing the error message, status, and timestamp.
 *
 * @param {any} err - The error object
 * @param {Request} req - The Express request object
 * @param {Response} res - The Express response object
 * @param {NextFunction} _next - The next middleware function
 */
export function errorHandler(err: any, req: Request, res: Response, _next?: NextFunction) {
  const status = err?.status || 500;
  const message = err?.message || 'Internal Server Error';
  const stack = err?.stack || 'No stack trace available';

  // Log the error in a structured way
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const logFilePath = path.join(logsDir, `${dateStr}.log`);

  // Ensure the logs directory exists
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const timestamp = now.toISOString();
  const method = req.method;
  const url = req.url;
  const userAgent = req.get('User-Agent') || 'Unknown';

  let logEntry = `ERROR - ${timestamp} - ${method} ${url} - Browser: ${userAgent}\n`;
  logEntry += `Status: ${status}\n`;
  logEntry += `Message: ${message}\n`;
  logEntry += `Stack Trace:\n${stack}\n\n`;

  fs.appendFile(logFilePath, logEntry, (logErr) => {
    if (logErr) {
      console.error('Failed to write error to log file:', logErr);
    }
  });

  // Respond to client
  res.status(status).json({
    error: {
      message,
      status,
      timestamp
    }
  });
}
