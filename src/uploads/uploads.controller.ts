import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { DownloadKeyDto, PresignDto } from './uploads.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Uploads')
@ApiBearerAuth()
@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

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
