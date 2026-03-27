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
import { diskStorage, memoryStorage } from 'multer';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { UploadsService } from './uploads.service';
import { DownloadKeyDto, PresignDto } from './uploads.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const UPLOAD_DIR = join(process.cwd(), 'uploads');

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
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          if (!existsSync(UPLOAD_DIR)) {
            mkdirSync(UPLOAD_DIR, { recursive: true });
          }
          cb(null, UPLOAD_DIR);
        },
        filename: (_req, file, cb) => {
          const ext = extname(file.originalname);
          cb(null, `${randomUUID()}${ext}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    const key = `uploads/${file.filename}`;
    return {
      key,
      url: `/uploads/${file.filename}`,
    };
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

  /**
   * Direct file upload — used when S3 is not configured (local development).
   * Returns the same { key } shape as the presign flow so frontend code is unified.
   */
  @Post('file')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    const { key } = await this.uploadsService.saveFile(
      file.buffer,
      file.originalname,
      file.mimetype,
    );
    return { key };
  }
}
