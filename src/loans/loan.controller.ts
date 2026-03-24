import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
} from '@nestjs/swagger';
import { LoanService } from './loan.service';
import { CreateLoanDto, ApproveLoanDto, RejectLoanDto } from './loan.dto';

/**
 * HTTP layer only — parse the request, call the service, return the result.
 * No business logic lives here.
 */
@ApiTags('Loans')
@ApiBearerAuth()
@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a loan application' })
  @ApiBody({
    type: CreateLoanDto,
    examples: {
      default: {
        value: {
          memberId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          amount: 500000,
          interestRate: 0.15,
          termMonths: 12,
          type: 'INDIVIDUAL',
          purpose: 'Purchase of agricultural equipment for farming season',
        },
      },
    },
  })
  apply(@Body() dto: CreateLoanDto) {
    return this.loanService.apply(dto);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a pending loan' })
  @ApiParam({ name: 'id', description: 'Loan UUID' })
  @ApiBody({
    type: ApproveLoanDto,
    examples: {
      default: {
        value: { approverId: 'd1b2c3d4-e5f6-7890-abcd-ef1234567890' },
      },
    },
  })
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ApproveLoanDto) {
    return this.loanService.approve(id, dto);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a pending loan' })
  @ApiParam({ name: 'id', description: 'Loan UUID' })
  @ApiBody({
    type: RejectLoanDto,
    examples: {
      default: {
        value: { reason: 'Insufficient income documentation provided' },
      },
    },
  })
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectLoanDto) {
    return this.loanService.reject(id, dto);
  }

  @Post(':id/disburse')
  @ApiOperation({ summary: 'Disburse an approved loan' })
  @ApiParam({ name: 'id', description: 'Loan UUID' })
  disburse(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.disburse(id);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close an active loan (fully repaid)' })
  @ApiParam({ name: 'id', description: 'Loan UUID' })
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.close(id);
  }

  @Get()
  @ApiOperation({ summary: 'List all loans' })
  findAll() {
    return this.loanService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single loan by ID' })
  @ApiParam({ name: 'id', description: 'Loan UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.findById(id);
  }
}
