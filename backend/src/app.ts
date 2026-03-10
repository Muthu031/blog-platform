import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARE ===
// Middleware runs before every request

app.use(helmet());              // Security headers
app.use(cors());                // Allow cross-origin requests
app.use(express.json());        // Parse JSON in request body

// === ROUTES ===

// Health check - is the server alive?
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'MULTI TENANT IS OK',
    timestamp: new Date().toISOString() 
  });
});

// === START SERVER ===

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;
