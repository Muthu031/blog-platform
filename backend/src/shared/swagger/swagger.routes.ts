import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.config';

const router = Router();

/**
 * Swagger UI endpoint
 * Access at http://localhost:3000/api-docs
 */
router.get(
  '/',
  swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
      persistAuthorization: true,
      displayOperationId: false,
    },
    customCss: '.topbar { display: none }',
    customSiteTitle: 'Blog Platform API Documentation',
  }) as any
);

/**
 * JSON spec endpoint
 * Access at http://localhost:3000/api-docs/spec
 */
router.get('/spec', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

export default router;
