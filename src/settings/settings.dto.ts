import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { BranchType } from './branch.enums';

export class CreateBranchDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(BranchType)
  type: BranchType;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  phone?: string;
}

export class UpdateBranchDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
