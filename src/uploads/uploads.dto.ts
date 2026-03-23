import { IsString, IsMimeType } from 'class-validator';

export class PresignDto {
  @IsString()
  filename: string;

  @IsMimeType()
  contentType: string;
}

export class PresignResponseDto {
  url: string;
  key: string;
}

export class DownloadKeyDto {
  @IsString()
  key: string;
}

export class DownloadUrlResponseDto {
  url: string;
}
