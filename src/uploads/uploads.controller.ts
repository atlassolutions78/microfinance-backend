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
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
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
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    const { key } = this.uploadsService.saveLocalFile(file.buffer, file.originalname);
    return { key };
  }
}
