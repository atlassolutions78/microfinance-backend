import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';
import { LoanService } from './loan.service';
import {
  ApplyLoanDto,
  DisburseDto,
  QueryLoansDto,
  RecordPaymentDto,
  RejectLoanDto,
} from './loan.dto';

@ApiTags('Loans')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // ---------------------------------------------------------------------------
  // Application
  // ---------------------------------------------------------------------------

  @Post()
  apply(@Body() dto: ApplyLoanDto, @CurrentUser() user: UserModel) {
    return this.loanService.apply(dto, user);
  }

  @Get()
  findAll(@Query() query: QueryLoansDto) {
    return this.loanService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single loan by ID' })
  @ApiParam({ name: 'id', description: 'Loan UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.findById(id);
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  @Post(':id/approve')
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.loanService.approve(id, user);
  }

  @Post(':id/reject')
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLoanDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.loanService.reject(id, dto, user);
  }

  @Post(':id/disburse')
  disburse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DisburseDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.loanService.disburse(id, dto, user);
  }

  // ---------------------------------------------------------------------------
  // Schedule & payments
  // ---------------------------------------------------------------------------

  @Get(':id/schedule')
  getSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.getSchedule(id);
  }

  @Post(':id/payments')
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.loanService.recordPayment(id, dto, user);
  }

  @Get(':id/payments')
  getPayments(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.getPayments(id);
  }

  // ---------------------------------------------------------------------------
  // Penalties & documents
  // ---------------------------------------------------------------------------

  @Get(':id/penalties')
  getPenalties(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.getPenalties(id);
  }

  @Get(':id/documents')
  getDocuments(@Param('id', ParseUUIDPipe) id: string) {
    return this.loanService.getDocuments(id);
  }

  /** Trigger the penalty processing cycle (admin / cron endpoint). */
  @Post('admin/process-penalties')
  processLatePenalties() {
    return this.loanService.processLatePenalties();
  }

  /** Trigger the auto-repayment cycle (admin / cron endpoint). */
  @Post('admin/process-repayments')
  processScheduledRepayments() {
    return this.loanService.processScheduledRepayments();
  }
}

