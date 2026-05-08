import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.enums';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';
import { LoanService } from './loan.service';
import {
  ActiveLoansQueryDto,
  ApplyLoanDto,
  CollectionsQueryDto,
  DisburseDto,
  GenerateDocumentQueryDto,
  LoanApplicationsQueryDto,
  QueryLoansDto,
  RecordPaymentDto,
  RejectLoanDto,
  UploadLoanDocumentDto,
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

  @Get('applications')
  findApplications(@Query() query: LoanApplicationsQueryDto) {
    return this.loanService.findApplications(query);
  }

  @Get('active')
  findActiveLoans(@Query() query: ActiveLoansQueryDto) {
    return this.loanService.findActiveLoans(query);
  }

  @Get('collections')
  findCollections(@Query() query: CollectionsQueryDto) {
    return this.loanService.findCollections(query);
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

  @Post(':id/documents')
  @ApiOperation({ summary: 'Upload a signed document for a loan (replaces existing of same type)' })
  @UseGuards(RolesGuard)
  @Roles(UserRole.LOAN_OFFICER, UserRole.TELLER)
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadLoanDocumentDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.loanService.uploadDocument(id, dto, user);
  }

  @Get(':id/documents/generate')
  @ApiOperation({ summary: 'Generate a blank printable document template for this loan' })
  async generateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GenerateDocumentQueryDto,
    @Res() res: Response,
  ) {
    const html = await this.loanService.generateDocument(id, query);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /** Trigger the late loan classification + penalty cycle (admin / cron endpoint). */
  @Post('admin/process-late-loans')
  processLateLoans() {
    return this.loanService.processLateLoans();
  }

  /** Trigger the auto-repayment cycle (admin / cron endpoint). */
  @Post('admin/process-repayments')
  processScheduledRepayments() {
    return this.loanService.processScheduledRepayments();
  }
}

