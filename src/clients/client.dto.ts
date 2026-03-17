import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';
import { ClientType } from './client.enums';

export class CreateClientDto {
  @IsEnum(ClientType)
  type: ClientType;

  @IsUUID()
  branchId: string;
}

export class ApproveKycDto {}

export class RejectKycDto {
  @IsString()
  @MinLength(10)
  notes: string;
}

export class RequestUpdateDto {
  @IsString()
  @MinLength(10)
  notes: string;
}
