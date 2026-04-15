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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserModel } from '../users/user.model';
import { TellerService } from './teller.service';
import {
  ApproveSessionDto,
  DepositPreviewQuery,
  ListSessionsQueryDto,
  RequestSessionDto,
  SubmitEodDto,
  TellerDepositDto,
  TellerTransferDto,
  TellerWithdrawalDto,
  TransferPreviewQuery,
  WithdrawalPreviewQuery,
} from './teller.dto';

@UseGuards(JwtAuthGuard)
@Controller('teller/sessions')
export class TellerController {
  constructor(private readonly tellerService: TellerService) {}

  /**
   * Teller requests a float for the day.
   * POST /teller/sessions
   */
  @Post()
  requestSession(
    @Body() dto: RequestSessionDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.tellerService.requestSession(dto, user);
  }

  /**
   * Branch manager approves the float and releases cash from vault.
   * POST /teller/sessions/:id/approve
   */
  @Post(':id/approve')
  approveSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveSessionDto,
    @CurrentUser() manager: UserModel,
  ) {
    return this.tellerService.approveSession(id, dto, manager);
  }

  /**
   * Teller opens their session (acknowledges receipt of cash).
   * POST /teller/sessions/:id/open
   */
  @Post(':id/open')
  openSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.tellerService.openSession(id, user);
  }

  /**
   * Returns a preview of the journal entry for a deposit before it is posted.
   * GET /teller/sessions/:id/deposit/preview?accountId=...&amount=...&currency=...
   */
  @Get(':id/deposit/preview')
  depositPreview(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DepositPreviewQuery,
    @CurrentUser() teller: UserModel,
  ) {
    return this.tellerService.depositPreview(id, query, teller);
  }

  /**
   * Process a client deposit at the teller window.
   * POST /teller/sessions/:id/deposit
   */
  @Post(':id/deposit')
  deposit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TellerDepositDto,
    @CurrentUser() teller: UserModel,
  ) {
    return this.tellerService.deposit(id, dto, teller);
  }

  /**
   * Returns a preview of the journal entry for a withdrawal before it is posted.
   * GET /teller/sessions/:id/withdraw/preview?accountId=...&amount=...&currency=...
   */
  @Get(':id/withdraw/preview')
  withdrawalPreview(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: WithdrawalPreviewQuery,
    @CurrentUser() teller: UserModel,
  ) {
    return this.tellerService.withdrawalPreview(id, query, teller);
  }

  /**
   * Process a client withdrawal at the teller window.
   * POST /teller/sessions/:id/withdraw
   */
  @Post(':id/withdraw')
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TellerWithdrawalDto,
    @CurrentUser() teller: UserModel,
  ) {
    return this.tellerService.withdraw(id, dto, teller);
  }

  /**
   * Returns a preview of the journal entry for a transfer before it is posted.
   * GET /teller/sessions/:id/transfer/preview?sourceAccountId=...&destinationAccountId=...&amount=...&currency=...
   */
  @Get(':id/transfer/preview')
  transferPreview(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: TransferPreviewQuery,
    @CurrentUser() teller: UserModel,
  ) {
    return this.tellerService.transferPreview(id, query, teller);
  }

  /**
   * Process a book transfer between two client accounts at the teller window.
   * No physical cash moves — the teller's cash position is unchanged.
   * POST /teller/sessions/:id/transfer
   */
  @Post(':id/transfer')
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TellerTransferDto,
    @CurrentUser() teller: UserModel,
  ) {
    return this.tellerService.transfer(id, dto, teller);
  }

  /**
   * Teller submits EOD with their declared physical cash count.
   * Moves session to PENDING_RECONCILIATION.
   * POST /teller/sessions/:id/eod
   */
  @Post(':id/eod')
  submitEod(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitEodDto,
    @CurrentUser() teller: UserModel,
  ) {
    return this.tellerService.submitEod(id, dto, teller);
  }

  /**
   * Branch manager confirms EOD reconciliation and closes the session.
   * Posts surplus/deficit journal entry and marks session CLOSED.
   * POST /teller/sessions/:id/close
   */
  @Post(':id/close')
  closeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() manager: UserModel,
  ) {
    return this.tellerService.closeSession(id, manager);
  }

  /**
   * List sessions. Tellers see their own; managers see all in their branch.
   * GET /teller/sessions
   */
  @Get()
  listSessions(@CurrentUser() user: UserModel, @Query() query: ListSessionsQueryDto) {
    return this.tellerService.listSessions(user, query);
  }

  /**
   * Manager: list all sessions awaiting EOD reconciliation.
   * Must be declared before @Get(':id') to avoid being matched as a UUID param.
   * GET /teller/sessions/pending-reconciliation
   */
  @Get('pending-reconciliation')
  pendingReconciliation(@CurrentUser() manager: UserModel) {
    return this.tellerService.listPendingReconciliation(manager);
  }

  /**
   * Get a session with its full transaction list.
   * Tellers see only their own sessions. Managers see all sessions in their branch.
   * GET /teller/sessions/:id
   */
  @Get(':id')
  getSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: UserModel,
  ) {
    return this.tellerService.getSession(id, user);
  }
}
