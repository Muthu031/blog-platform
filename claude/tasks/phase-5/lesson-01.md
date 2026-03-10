# Lesson 1: AWS S3 Setup

## 🎯 Goal
Configure AWS S3 for scalable file storage and management.

## 📚 What You'll Learn
- Set up AWS S3 bucket
- Configure AWS credentials
- Implement S3 client
- Handle file uploads securely

## 📋 Prerequisites
- Completed Phase 4
- AWS account created
- Backend server running

## 🛠️ Tasks

### 1. Create AWS S3 Bucket

Via AWS Console or CLI:

```bash
aws s3 mb s3://your-app-files --region us-east-1
```

### 2. Install AWS SDK

```bash
cd backend
npm install @aws-sdk/client-s3
npm install -D @types/aws-sdk
```

### 3. Create S3 Service

Create `backend/src/services/s3.ts`:

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    this.bucket = process.env.AWS_S3_BUCKET || '';
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    key: string,
    body: Buffer | string,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata
      });

      await this.client.send(command);

      return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for upload
   */
  async generateUploadPresignedUrl(
    key: string,
    contentType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType
      });

      return await getSignedUrl(this.client, command, {
        expiresIn
      });
    } catch (error) {
      console.error('Presigned URL generation error:', error);
      throw error;
    }
  }

  /**
   * Generate presigned URL for download
   */
  async generateDownloadPresignedUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      return await getSignedUrl(this.client, command, {
        expiresIn
      });
    } catch (error) {
      console.error('Download presigned URL error:', error);
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
    } catch (error) {
      console.error('S3 delete error:', error);
      throw error;
    }
  }

  /**
   * List files in prefix
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix
      });

      const response = await this.client.send(command);
      return (response.Contents || []).map(item => item.Key || '');
    } catch (error) {
      console.error('S3 list error:', error);
      throw error;
    }
  }
}

export const s3Service = new S3Service();
```

### 4. Update Environment Variables

Add to `.env`:

```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
```

### 5. Create File Upload Controller

Create `backend/src/modules/files/file.controller.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { authenticate } from '../../shared/middleware/auth';
import multer from 'multer';
import { s3Service } from '../../services/s3';

const router = Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// POST /api/tasks/:taskId/files - Upload file
router.post('/', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const key = `tasks/${req.params.taskId}/${Date.now()}-${req.file.originalname}`;

    const url = await s3Service.uploadFile(
      key,
      req.file.buffer,
      req.file.mimetype,
      {
        taskId: req.params.taskId,
        uploadedBy: req.user.id
      }
    );

    // Store file reference in database
    const fileRecord = await prisma.taskFile.create({
      data: {
        taskId: req.params.taskId,
        name: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
        s3Key: key,
        url,
        uploadedBy: req.user.id
      }
    });

    res.status(201).json(fileRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/files/:fileId - Delete file
router.delete('/:fileId', authenticate, async (req: Request, res: Response) => {
  try {
    const file = await prisma.taskFile.findUnique({
      where: { id: req.params.fileId }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    await s3Service.deleteFile(file.s3Key);

    await prisma.taskFile.delete({
      where: { id: req.params.fileId }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## ✅ Verification Checklist

- [ ] AWS credentials configured
- [ ] S3 bucket created
- [ ] S3 client initializes successfully
- [ ] Files can be uploaded to S3
- [ ] Presigned URLs are generated
- [ ] Files can be downloaded
- [ ] Files can be deleted
- [ ] File metadata is stored
- [ ] Errors are handled
- [ ] AWS connection is secure

## 📚 Resources

- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SDK for JavaScript](https://docs.aws.amazon.com/sdk-for-javascript/)
- [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
