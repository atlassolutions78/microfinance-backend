import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { LoanService } from './loan.service';
import { CreateLoanDto, ApproveLoanDto, RejectLoanDto } from './loan.dto';

/**
 * HTTP layer only — parse the request, call the service, return the result.
 * No business logic lives here.
 */
@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Post()
  apply(@Body() dto: CreateLoanDto) {
    return this.loanService.apply(dto);
  }

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveLoanDto,
  ) {
    return this.loanService.approve(id, dto);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLoanDto,
  ) {
    return this.loanService.reject(id, dto);
  }

  @Post(':id/disburse')
  disburse(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.disburse(id);
  }

  @Post(':id/close')
  close(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.close(id);
  }

  @Get()
  findAll() {
    return this.loanService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.findById(id);
  }
}
