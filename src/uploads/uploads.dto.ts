import { IsString, IsMimeType } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PresignDto {
  @ApiProperty({
    description: 'Original filename including extension',
    example: 'id_card.jpg',
  })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'MIME type of the file', example: 'image/jpeg' })
  @IsMimeType()
  contentType: string;
}

export class PresignResponseDto {
  @ApiProperty({ description: 'Pre-signed S3 URL to upload the file to' })
  url: string;

  @ApiProperty({
    description: 'S3 object key to reference the file after upload',
  })
  key: string;
}
