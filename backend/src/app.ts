import 'module-alias/register';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organizations/organization.routes';
import projectRoutes from './modules/projects/project.controller';
import swaggerRoutes from './shared/swagger/swagger.routes';
import { errorHandler } from './shared/middleware/error.middleware';
import { log } from 'console';


// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// === MIDDLEWARE ===
// Middleware runs before every request

app.use(helmet());              // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));                            // Allow cross-origin requests
app.use(express.json());        // Parse JSON in request body
app.use(cookieParser());        // Parse cookies

// === ROUTES ===

// Health check - is the server alive?
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString() 
  });
});

// API Documentation - Serve static files and UI
app.use('/api-docs', swaggerUi.serve as any);
app.use('/api-docs', swaggerRoutes);

// Authentication routes
app.use('/api/auth', authRoutes);

// Organization routes
app.use('/api/organizations', organizationRoutes);

// Project routes (nested under organizations)
app.use('/api/organizations/:orgId/projects', projectRoutes);

// === ERROR HANDLER (must be last) ===
app.use(errorHandler);
// === START SERVER ===

app.listen(PORT, () => {
  log(`🚀 Server running on http://localhost:${PORT}`);
  log(`📊 Health check: http://localhost:${PORT}/health`);
  log(`🔐 Authentication: http://localhost:${PORT}/api/auth`);
  log(`🏢 Organizations: http://localhost:${PORT}/api/organizations`);
  log(`📚 API Docs: http://localhost:${PORT}/api-docs`);
});

export default app;
