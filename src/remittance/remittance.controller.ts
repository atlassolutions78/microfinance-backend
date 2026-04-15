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
import { RemittanceService } from './remittance.service';
import {
  CancelRemittanceDto,
  GetRemittancesQueryDto,
  PayoutRemittanceDto,
  PayoutRemittancePreviewQuery,
  SendRemittanceDto,
  SendRemittancePreviewQuery,
} from './remittance.dto';

@UseGuards(JwtAuthGuard)
@Controller('remittances')
export class RemittanceController {
  constructor(private readonly remittanceService: RemittanceService) {}

  /**
   * Leg 1 — Teller receives cash from sender and creates the remittance.
   * Their session cash increases. Transit account credited.
   * POST /remittances/send
   */
  @Post('send')
  send(@Body() dto: SendRemittanceDto, @CurrentUser() teller: UserModel) {
    return this.remittanceService.send(dto, teller);
  }

  /**
   * Leg 2 — Receiving teller pays out cash to the recipient.
   * Their session cash decreases. Transit account debited.
   * POST /remittances/:id/payout
   */
  @Post(':id/payout')
  payout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PayoutRemittanceDto,
    @CurrentUser() teller: UserModel,
  ) {
    return this.remittanceService.payout(id, dto, teller);
  }

  /**
   * Cancel a PENDING remittance. Cash returns to the sending teller's drawer.
   * Transit account debited and cleared.
   * POST /remittances/:id/cancel
   */
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelRemittanceDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.remittanceService.cancel(id, dto, user);
  }

  /**
   * Returns active branches the teller can send a remittance to.
   * Excludes the teller's own branch. Used to populate the branch dropdown.
   * GET /remittances/receiving-branches
   */
  @Get('receiving-branches')
  listReceivingBranches(@CurrentUser() user: UserModel) {
    return this.remittanceService.listReceivingBranches(user);
  }

  /**
   * Preview the journal entry before sending a remittance.
   * Shows the teller's cash position before and after, and the affected COA accounts.
   * GET /remittances/send-preview?sessionId=...&receivingBranchId=...&amount=...&currency=...
   */
  @Get('send-preview')
  sendPreview(
    @Query() query: SendRemittancePreviewQuery,
    @CurrentUser() teller: UserModel,
  ) {
    return this.remittanceService.sendPreview(query, teller);
  }

  /**
   * Preview the journal entry before paying out a remittance.
   * Shows the teller's cash position before and after, the recipient details,
   * and the affected COA accounts.
   * GET /remittances/:id/payout-preview?payoutSessionId=...
   */
  @Get(':id/payout-preview')
  payoutPreview(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PayoutRemittancePreviewQuery,
    @CurrentUser() teller: UserModel,
  ) {
    return this.remittanceService.payoutPreview(id, query, teller);
  }

  /**
   * Look up a remittance by its reference code (e.g. RMT-20260405-A3F9C1).
   * Used by Branch B teller before initiating payout.
   * GET /remittances/by-reference?ref=RMT-...
   */
  @Get('by-reference')
  findByReference(@Query('ref') reference: string) {
    return this.remittanceService.findByReference(reference);
  }

  /**
   * Remittances pending collection at the current user's branch.
   * GET /remittances/pending
   */
  @Get('pending')
  listPending(
    @Query() query: GetRemittancesQueryDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.remittanceService.listPendingForMyBranch(user, query);
  }

  /**
   * All remittances sent from the current user's branch.
   * GET /remittances/sent
   */
  @Get('sent')
  listSent(
    @Query() query: GetRemittancesQueryDto,
    @CurrentUser() user: UserModel,
  ) {
    return this.remittanceService.listSentFromMyBranch(user, query);
  }

  /**
   * All remittances across the institution (admin/manager view).
   * GET /remittances
   */
  @Get()
  listAll(@Query() query: GetRemittancesQueryDto) {
    return this.remittanceService.listAll(query);
  }

  /**
   * Get a single remittance by ID.
   * GET /remittances/:id
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.remittanceService.findById(id);
  }
}
