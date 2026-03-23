import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { PresignDto, PresignResponseDto, DownloadUrlResponseDto } from './uploads.dto';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly localUploadDir: string;
  private readonly isS3Configured: boolean;

  constructor(private readonly config: ConfigService) {
    this.bucket = config.get<string>('AWS_S3_BUCKET', '');
    this.isS3Configured = !!this.bucket;

    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });

    this.localUploadDir = config.get<string>('UPLOAD_DIR', './uploads');
    if (!this.isS3Configured) {
      if (!existsSync(this.localUploadDir)) {
        mkdirSync(this.localUploadDir, { recursive: true });
      }
    }
  }

  get useLocalStorage(): boolean {
    return !this.isS3Configured;
  }

  async presign(dto: PresignDto): Promise<PresignResponseDto> {
    const ext = extname(dto.filename);
    const key = `uploads/${randomUUID()}${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    return { url, key };
  }

  async getDownloadUrl(key: string): Promise<DownloadUrlResponseDto> {
    if (this.useLocalStorage) {
      // Strip the leading "uploads/" directory prefix — static files are served
      // from ./uploads at prefix /uploads/serve, so the path segment is just the filename.
      const filename = key.replace(/^uploads\//, '');
      return { url: `/uploads/serve/${filename}` };
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    return { url };
  }

  saveLocalFile(buffer: Buffer, originalName: string): { key: string } {
    const ext = extname(originalName);
    const filename = `${randomUUID()}${ext}`;
    const key = `uploads/${filename}`;
    const filePath = join(this.localUploadDir, filename);
    writeFileSync(filePath, buffer);
    return { key };
  }
}
