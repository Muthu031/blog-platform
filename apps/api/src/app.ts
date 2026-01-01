import express from 'express'
import routes from './api/routes'
import { errorHandler } from './api/middlewares/errorHandler'
import { logger } from './api/middlewares/logger'
import dotenv from 'dotenv'
import cors from 'cors'
dotenv.config()

// Explicit type annotation so the exported `app` has a stable, portable type
const app: express.Express = express()
app.use(express.json())
app.use(
  cors({
    origin: ['http://localhost:8080'],
    credentials: true,
  })
);
app.use(logger)
app.use('/api', routes)
app.use(errorHandler)

export default app
