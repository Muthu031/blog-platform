# Lesson 4: Production Deployment

## 🎯 Goal
Deploy the application to production with proper configuration and monitoring.

## 📚 What You'll Learn
- Deploy to AWS ECS
- Configure environment variables
- Set up SSL certificates
- Create deployment scripts

## 📋 Prerequisites
- Completed Phase 6 Lessons 1-3
- AWS infrastructure ready
- Docker images in registry

## 🛠️ Tasks

### 1. Create ECS Task Definition

Create `deployment/ecs-task-definition.json`:

```json
{
  "family": "blog-platform-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "your-registry/blog-api:latest",
      "portMappings": [
        {
          "containerPort": 3001,
          "hostPort": 3001,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:database-url"
        },
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/blog-platform",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "api"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3001/health || exit 1"],
        "interval": 30,
        "timeout": 10,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ],
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole"
}
```

### 2. Create Deployment Script

Create `deployment/deploy.sh`:

```bash
#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Configuration
CLUSTER_NAME="blog-platform"
SERVICE_NAME="blog-api"
REGION="us-east-1"
IMAGE_TAG="${1:-latest}"

# Get the current task definition
TASK_DEF=$(aws ecs describe-task-definition \
  --task-definition $SERVICE_NAME \
  --region $REGION \
  --query 'taskDefinition')

# Register new task definition with updated image
NEW_TASK_DEF=$(echo $TASK_DEF | \
  jq '.containerDefinitions[0].image = "your-registry/blog-api:'"$IMAGE_TAG"'"' | \
  jq 'del(.taskDefinitionArn, .revision, .status, .requiresAttributes)')

REVISION=$(aws ecs register-task-definition \
  --region $REGION \
  --cli-input-json "$(echo $NEW_TASK_DEF | jq -c .)" \
  --query 'taskDefinition.revision' \
  --output text)

echo "✅ Registered new task definition: $SERVICE_NAME:$REVISION"

# Update service with new task definition
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition "$SERVICE_NAME:$REVISION" \
  --region $REGION

echo "✅ Updated service to use new task definition"

# Wait for service to stabilize
echo "⏳ Waiting for deployment to complete..."

aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION

echo "✅ Deployment complete!"
```

### 3. Create Health Check Endpoint

Update `backend/src/server.ts`:

```typescript
// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// Deep health check
app.get('/health/deep', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    await redis.redis.ping();

    res.json({
      status: 'healthy',
      checks: {
        database: 'ok',
        redis: 'ok',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### 4. Create Rollback Script

Create `deployment/rollback.sh`:

```bash
#!/bin/bash

CLUSTER_NAME="blog-platform"
SERVICE_NAME="blog-api"
REGION="us-east-1"

echo "🔄 Rolling back to previous task definition..."

# Get deployment
DEPLOYMENT=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --query 'services[0].deployments[1]' \
  --output json)

TASK_DEF_ARN=$(echo $DEPLOYMENT | jq '.taskDefinition' -r)

aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $TASK_DEF_ARN \
  --region $REGION

echo "✅ Rollback initiated"
```

### 5. Create Monitoring Dashboard

Create monitoring using CloudWatch:

```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /ecs/blog-platform

# Set up alarms
aws cloudwatch put-metric-alarm \
  --alarm-name blog-api-cpu-high \
  --alarm-description "Alert when CPU is high" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

## ✅ Verification Checklist

- [ ] ECS cluster created
- [ ] Task definition registered
- [ ] Service deployed to ECS
- [ ] Health checks passing
- [ ] Load balancer routes traffic
- [ ] Environment variables set
- [ ] Secrets configured
- [ ] Logs appear in CloudWatch
- [ ] Alarms are configured
- [ ] Rollback script works

## 📚 Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Fargate Deployment](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-cpu-memory-error.html)
- [Blue-Green Deployment](https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/welcome.html)
