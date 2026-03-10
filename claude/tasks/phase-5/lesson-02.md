# Lesson 2: File Upload with Presigned URLs

## 🎯 Goal
Implement secure file uploads using presigned URLs for direct S3 access.

## 📚 What You'll Learn
- Generate presigned upload URLs
- Implement client-side upload
- Validate file before upload
- Track upload progress

## 📋 Prerequisites
- Completed Phase 5 Lesson 1
- AWS S3 configured
- Frontend React setup

## 🛠️ Tasks

### 1. Create Presigned URL Endpoint

Update `backend/src/modules/files/file.controller.ts`:

```typescript
// POST /api/tasks/:taskId/files/presigned - Get presigned URL
router.post('/presigned', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename, contentType } = req.body;

    if (!filename || !contentType) {
      return res.status(400).json({ error: 'filename and contentType required' });
    }

    // Validate MIME type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'application/msword',
      'text/plain'
    ];

    if (!allowedTypes.includes(contentType)) {
      return res.status(400).json({ error: 'File type not allowed' });
    }

    const key = `tasks/${req.params.taskId}/${Date.now()}-${filename}`;

    const presignedUrl = await s3Service.generateUploadPresignedUrl(
      key,
      contentType,
      3600 // 1 hour
    );

    res.json({
      presignedUrl,
      s3Key: key,
      bucket: process.env.AWS_S3_BUCKET
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks/:taskId/files/upload-complete - Confirm upload
router.post('/upload-complete', authenticate, async (req: Request, res: Response) => {
  try {
    const { s3Key, filename, size, contentType } = req.body;

    const fileRecord = await prisma.taskFile.create({
      data: {
        taskId: req.params.taskId,
        name: filename,
        size,
        mimeType: contentType,
        s3Key,
        url: `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
        uploadedBy: req.user.id
      }
    });

    res.status(201).json(fileRecord);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### 2. Create Frontend Upload Hook

Create `frontend/src/hooks/useFileUpload.ts`:

```typescript
import { useState, useCallback } from 'react';

interface UseFileUploadOptions {
  taskId: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (file: any) => void;
  onError?: (error: Error) => void;
}

export const useFileUpload = (options: UseFileUploadOptions) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    try {
      // Step 1: Get presigned URL
      const presignedResponse = await fetch(
        `/api/tasks/${options.taskId}/files/presigned`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type
          })
        }
      );

      if (!presignedResponse.ok) {
        throw new Error('Failed to get presigned URL');
      }

      const { presignedUrl, s3Key } = await presignedResponse.json();

      // Step 2: Upload file to S3
      const xhr = new XMLHttpRequest();

      // Track upload progress
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = (e.loaded / e.total) * 100;
          options.onProgress?.(progress);
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Confirm upload
      const confirmResponse = await fetch(
        `/api/tasks/${options.taskId}/files/upload-complete`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            s3Key,
            filename: file.name,
            size: file.size,
            contentType: file.type
          })
        }
      );

      const uploadedFile = await confirmResponse.json();

      options.onSuccess?.(uploadedFile);
      return uploadedFile;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Upload failed');
      setError(error);
      options.onError?.(error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }, [options]);

  return {
    uploadFile,
    isUploading,
    error
  };
};
```

### 3. Create Upload Component

Create `frontend/src/components/FileUploadZone.tsx`:

```typescript
import React, { useRef } from 'react';
import styled from 'styled-components';
import { useFileUpload } from '../hooks/useFileUpload';

interface FileUploadZoneProps {
  taskId: string;
  onFileUploaded: (file: any) => void;
}

const DropZone = styled.div`
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #007bff;
    background: #f0f8ff;
  }

  &.dragging {
    border-color: #007bff;
    background: #f0f8ff;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: #eee;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 10px;
`;

const Progress = styled.div<{ percent: number }>`
  height: 100%;
  background: #007bff;
  width: ${props => props.percent}%;
  transition: width 0.3s;
`;

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  taskId,
  onFileUploaded
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [uploadProgress, setUploadProgress] = React.useState(0);

  const { uploadFile, isUploading } = useFileUpload({
    taskId,
    onProgress: setUploadProgress,
    onSuccess: onFileUploaded
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadFile(e.target.files[0]);
    }
  };

  return (
    <>
      <DropZone
        className={isDragging ? 'dragging' : ''}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <>
            <div>Uploading...</div>
            <ProgressBar>
              <Progress percent={uploadProgress} />
            </ProgressBar>
          </>
        ) : (
          <>
            <div>📁 Drag files here or click to select</div>
            <p style={{ fontSize: '12px', color: '#666' }}>
              Max 10MB • PNG, JPG, PDF, DOC
            </p>
          </>
        )}
      </DropZone>

      <HiddenInput
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
      />
    </>
  );
};
```

## ✅ Verification Checklist

- [ ] Presigned URL endpoint works
- [ ] Files upload directly to S3
- [ ] Upload progress is tracked
- [ ] File metadata is stored in DB
- [ ] Client can drag & drop files
- [ ] File validation works
- [ ] Progress bar displays correctly
- [ ] Error handling works
- [ ] Presigned URLs expire correctly
- [ ] Uploaded files are accessible

## 📚 Resources

- [Presigned URLs Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
- [File Upload Best Practices](https://www.smashingmagazine.com/2018/01/drag-drop-file-upload-react-with-hooks/)
- [Progress Tracking](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload)
