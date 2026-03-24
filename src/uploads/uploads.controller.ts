import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiBody, ApiOperation } from '@nestjs/swagger';
import { UploadsService } from './uploads.service';
import { PresignDto } from './uploads.dto';
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
}
