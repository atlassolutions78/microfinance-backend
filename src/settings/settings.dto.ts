import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchType } from './branch.enums';

export class CreateBranchDto {
  @ApiProperty({
    description: 'Human-readable branch name',
    example: 'Kinshasa Main Branch',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Unique short code for the branch',
    example: 'KIN-001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    enum: BranchType,
    description: 'HEAD for headquarters, NORMAL for regular branch',
    example: BranchType.NORMAL,
  })
  @IsEnum(BranchType)
  type: BranchType;

  @ApiProperty({
    description: 'Physical address of the branch',
    example: 'Avenue du Commerce 14, Gombe, Kinshasa',
  })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiPropertyOptional({
    description: 'Contact phone number for the branch',
    example: '+243812345678',
  })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class UpdateBranchDto {
  @ApiPropertyOptional({
    description: 'Updated branch name',
    example: 'Kinshasa Central Branch',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated physical address',
    example: 'Boulevard du 30 Juin 22, Gombe, Kinshasa',
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({
    description: 'Updated contact phone number',
    example: '+243898765432',
  })
  @IsString()
  @IsOptional()
  phone?: string;
}
