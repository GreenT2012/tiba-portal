import { PutObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';

@Injectable()
export class StorageService {
  private readonly bucket: string;
  private readonly client: S3Client;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT;
    const accessKeyId = process.env.MINIO_ACCESS_KEY;
    const secretAccessKey = process.env.MINIO_SECRET_KEY;
    const bucket = process.env.MINIO_BUCKET ?? process.env.MINIO_DEFAULT_BUCKET;
    const region = process.env.MINIO_REGION ?? 'us-east-1';
    const useSsl = (process.env.MINIO_USE_SSL ?? 'false').toLowerCase() === 'true';

    if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
      throw new Error('MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY and MINIO_BUCKET (or MINIO_DEFAULT_BUCKET) are required');
    }

    const normalizedEndpoint = endpoint.startsWith('http')
      ? endpoint
      : `${useSsl ? 'https' : 'http'}://${endpoint}`;

    this.bucket = bucket;
    this.client = new S3Client({
      endpoint: normalizedEndpoint,
      region,
      forcePathStyle: true,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
  }

  getBucket() {
    return this.bucket;
  }

  createObjectKey(customerId: string, ticketId: string, attachmentId: string, filename: string) {
    return `customers/${customerId}/tickets/${ticketId}/${attachmentId}-${filename}`;
  }

  async getPresignedUploadUrl(key: string, contentType: string, expiresIn = 900) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getPresignedDownloadUrl(key: string, expiresIn = 900) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }
}
