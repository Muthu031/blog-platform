import swaggerJsdoc from 'swagger-jsdoc';

const options: any = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Blog Platform API',
      version: '1.0.0',
      description: 'Complete multi-tenant SaaS platform with organizations, projects, tasks, and real-time collaboration',
      contact: {
        name: 'Support',
        email: 'support@blogplatform.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
      {
        url: 'https://api.blogplatform.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                },
                statusCode: {
                  type: 'number',
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
            },
            avatarUrl: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            emailVerified: {
              type: 'boolean',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              description: 'Must contain at least 8 characters, 1 uppercase, 1 lowercase, and 1 number',
              example: 'Password123',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'Password123',
            },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                accessToken: {
                  type: 'string',
                  description: 'JWT access token (short-lived)',
                },
              },
            },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            slug: {
              type: 'string',
            },
            description: {
              type: 'string',
              nullable: true,
            },
            members: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                  },
                  userId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  organizationId: {
                    type: 'string',
                    format: 'uuid',
                  },
                  role: {
                    type: 'string',
                    enum: ['member', 'admin', 'owner'],
                  },
                  user: {
                    $ref: '#/components/schemas/User',
                  }
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        CreateOrganizationRequest: {
          type: 'object',
          required: ['name', 'slug'],
          properties: {
            name: {
              type: 'string',
              example: 'Acme Inc',
            },
            slug: {
              type: 'string',
              example: 'acme-inc',
            },
            description: {
              type: 'string',
              example: 'Our company description',
            },
          },
        },
        CreateInvitationRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            role: {
              type: 'string',
              enum: ['member', 'admin'],
              example: 'member',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
apis: ['./src/docs/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
