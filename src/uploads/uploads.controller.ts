import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
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
}
