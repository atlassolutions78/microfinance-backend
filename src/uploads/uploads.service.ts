import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { PresignDto, PresignResponseDto, DownloadUrlResponseDto } from './uploads.dto';

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('AWS_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.get<string>('AWS_ACCESS_KEY_ID', ''),
        secretAccessKey: config.get<string>('AWS_SECRET_ACCESS_KEY', ''),
      },
    });
    this.bucket = config.get<string>('AWS_S3_BUCKET', '');
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
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    return { url };
  }
}
