import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Get,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody, ApiOperation } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { UploadsService } from './uploads.service';
import { DownloadKeyDto, PresignDto } from './uploads.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { join, extname } from 'path';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const { key } = await this.uploadsService.saveFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    return { key };
  }

  @Post('presign')
  @ApiOperation({ summary: 'Get a pre-signed S3 URL to upload a file' })
  @ApiBody({
    type: PresignDto,
    examples: {
      default: {
        value: {
          filename: 'national_id_front.jpg',
          contentType: 'image/jpeg',
        },
      },
    },
  })
  presign(@Body() dto: PresignDto) {
    return this.uploadsService.presign(dto);
  }

  @Get('download')
  download(@Query() dto: DownloadKeyDto) {
    return this.uploadsService.getDownloadUrl(dto.key);
  }
}
