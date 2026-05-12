import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ClientTransactionEntity,
  SessionDenominationEntity,
  TransferEntity,
} from '../teller/teller.entity';
import { AccountEntity } from '../accounts/account.entity';
import { BranchEntity } from '../settings/branch.entity';
import { UserEntity } from '../users/user.entity';
import { RemittanceEntity } from '../remittance/remittance.entity';
import {
  IndividualProfileEntity,
  OrganizationProfileEntity,
} from '../clients/client.entity';
import { AccountTxType } from '../teller/teller.enums';

// ---------------------------------------------------------------------------
// Internal data shapes — not exposed outside this service
// ---------------------------------------------------------------------------

interface DenominationLine {
  denomination: number;
  quantity: number;
  subtotal: string;
}

interface AccountTxReceiptData {
  type: AccountTxType;
  reference: string;
  date: Date;
  amount: string;
  currency: string;
  balanceAfter: string;
  accountNumber: string;
  clientName: string;
  tellerName: string;
  branchName: string;
  // Transfer only
  destAccountNumber?: string;
  destClientName?: string;
  feeAmount?: string;
  // Deposit only
  depositorName?: string;
  depositorPhone?: string;
  denominations?: DenominationLine[];
}

interface RemittanceReceiptData {
  reference: string;
  date: Date;
  amount: string;
  currency: string;
  recipientName: string;
  recipientIdNumber: string;
  recipientPhone: string | null;
  senderBranchName: string;
  tellerName: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Receipt service
// ---------------------------------------------------------------------------

@Injectable()
export class ReceiptService {
  constructor(
    @InjectRepository(ClientTransactionEntity)
    private readonly txRepo: Repository<ClientTransactionEntity>,
    @InjectRepository(TransferEntity)
    private readonly transferRepo: Repository<TransferEntity>,
    @InjectRepository(SessionDenominationEntity)
    private readonly denominationRepo: Repository<SessionDenominationEntity>,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectRepository(BranchEntity)
    private readonly branchRepo: Repository<BranchEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(RemittanceEntity)
    private readonly remittanceRepo: Repository<RemittanceEntity>,
    @InjectRepository(IndividualProfileEntity)
    private readonly individualRepo: Repository<IndividualProfileEntity>,
    @InjectRepository(OrganizationProfileEntity)
    private readonly orgRepo: Repository<OrganizationProfileEntity>,
  ) {}

  // ── Public: account transaction receipt (deposit / withdrawal / transfer) ──

  async forAccountTx(txId: string): Promise<string> {
    const tx = await this.txRepo.findOne({ where: { id: txId } });
    if (!tx) throw new NotFoundException(`Transaction ${txId} not found.`);

    const [account, teller, branch] = await Promise.all([
      this.accountRepo.findOne({ where: { id: tx.account_id } }),
      this.userRepo.findOne({ where: { id: tx.performed_by } }),
      this.branchRepo.findOne({ where: { id: tx.branch_id } }),
    ]);

    const clientName = account
      ? await this.resolveClientName(account.client_id)
      : 'Unknown';

    const data: AccountTxReceiptData = {
      type: tx.type as AccountTxType,
      reference: tx.reference,
      date: tx.created_at,
      amount: Number(tx.amount).toFixed(2),
      currency: tx.currency,
      balanceAfter: Number(tx.balance_after).toFixed(2),
      accountNumber: account?.account_number ?? '—',
      clientName,
      tellerName: teller
        ? `${teller.first_name} ${teller.last_name}`
        : 'Unknown',
      branchName: branch?.name ?? 'Unknown',
    };

    // For deposits and withdrawals, load denomination breakdown
    if (
      tx.type === AccountTxType.DEPOSIT ||
      tx.type === AccountTxType.WITHDRAWAL
    ) {
      if (tx.type === AccountTxType.DEPOSIT) {
        data.depositorName = tx.depositor_name ?? undefined;
        data.depositorPhone = tx.depositor_phone ?? undefined;
      }
      const denoms = await this.denominationRepo.find({
        where: { account_tx_id: txId },
        order: { denomination: 'ASC' },
      });
      data.denominations = denoms.map((d) => ({
        denomination: Number(d.denomination),
        quantity: Number(d.quantity),
        subtotal: Number(d.subtotal).toFixed(2),
      }));
    }

    // For transfers, fetch the other leg to show destination
    if (
      tx.type === AccountTxType.TRANSFER_OUT ||
      tx.type === AccountTxType.TRANSFER_IN
    ) {
      const transfer = await this.transferRepo.findOne({
        where: { debit_transaction_id: txId },
      });

      if (transfer?.credit_transaction_id) {
        const creditTx = await this.txRepo.findOne({
          where: { id: transfer.credit_transaction_id },
        });
        if (creditTx) {
          const destAccount = await this.accountRepo.findOne({
            where: { id: creditTx.account_id },
          });
          data.destAccountNumber = destAccount?.account_number ?? '—';
          data.destClientName = destAccount
            ? await this.resolveClientName(destAccount.client_id)
            : 'Unknown';
          data.feeAmount = Number(transfer.fee_amount).toFixed(2);
        }
      }
    }

    return this.renderAccountTx(data);
  }

  // ── Public: remittance receipt ──────────────────────────────────────────────

  async forRemittance(id: string): Promise<string> {
    const remittance = await this.remittanceRepo.findOne({ where: { id } });
    if (!remittance) throw new NotFoundException(`Remittance ${id} not found.`);

    const [branch, teller] = await Promise.all([
      this.branchRepo.findOne({ where: { id: remittance.sending_branch_id } }),
      this.userRepo.findOne({ where: { id: remittance.sending_teller_id } }),
    ]);

    const data: RemittanceReceiptData = {
      reference: remittance.reference,
      date: remittance.created_at,
      amount: Number(remittance.amount).toFixed(2),
      currency: remittance.currency,
      recipientName: remittance.recipient_name,
      recipientIdNumber: remittance.recipient_id_number,
      recipientPhone: remittance.recipient_phone,
      senderBranchName: branch?.name ?? 'Unknown',
      tellerName: teller
        ? `${teller.first_name} ${teller.last_name}`
        : 'Unknown',
      status: remittance.status,
    };

    return this.renderRemittance(data);
  }

  // ── Private: resolve client name from client_id ─────────────────────────────

  private async resolveClientName(clientId: string): Promise<string> {
    const individual = await this.individualRepo.findOne({
      where: { client_id: clientId },
    });
    if (individual) {
      return `${individual.first_name} ${individual.last_name}`;
    }
    const org = await this.orgRepo.findOne({ where: { client_id: clientId } });
    return org?.organization_name ?? 'Unknown';
  }

  // ── Private: HTML renderers ─────────────────────────────────────────────────

  private renderAccountTx(d: AccountTxReceiptData): string {
    if (d.type === AccountTxType.DEPOSIT) {
      return renderDepositBordereau(d);
    }
    if (d.type === AccountTxType.WITHDRAWAL) {
      return renderWithdrawalReceipt(d);
    }

    const title =
      {
        [AccountTxType.WITHDRAWAL]: 'WITHDRAWAL',
        [AccountTxType.TRANSFER_OUT]: 'TRANSFER',
        [AccountTxType.TRANSFER_IN]: 'TRANSFER',
        [AccountTxType.LOAN_DISBURSEMENT]: 'LOAN DISBURSEMENT',
        [AccountTxType.LOAN_REPAYMENT]: 'LOAN REPAYMENT',
        [AccountTxType.FEE]: 'FEE',
        [AccountTxType.PENALTY]: 'PENALTY',
      }[d.type] ?? d.type;

    const amountLabel =
      {
        [AccountTxType.WITHDRAWAL]: 'Withdrawn',
        [AccountTxType.TRANSFER_OUT]: 'Transferred',
        [AccountTxType.TRANSFER_IN]: 'Received',
        [AccountTxType.LOAN_DISBURSEMENT]: 'Disbursed',
        [AccountTxType.LOAN_REPAYMENT]: 'Repaid',
        [AccountTxType.FEE]: 'Fee',
        [AccountTxType.PENALTY]: 'Penalty',
      }[d.type] ?? 'Amount';

    const isTransfer =
      d.type === AccountTxType.TRANSFER_OUT ||
      d.type === AccountTxType.TRANSFER_IN;

    const transferSection =
      isTransfer && d.destAccountNumber
        ? `
        ${row('From', d.accountNumber)}
        ${row('Client', d.clientName)}
        ${divider()}
        ${row('To', d.destAccountNumber)}
        ${row('Recipient', d.destClientName ?? '—')}
        ${d.feeAmount && Number(d.feeAmount) > 0 ? row('Fee', `${d.currency} ${d.feeAmount}`) : ''}
      `
        : `
        ${row('Account', d.accountNumber)}
        ${row('Client', d.clientName)}
      `;

    const body = `
      ${header(d.branchName)}
      ${divider()}
      ${centered(title)}
      ${divider()}
      ${row('Date', formatDate(d.date))}
      ${row('Time', formatTime(d.date))}
      ${row('Ref', d.reference)}
      ${row('Teller', d.tellerName)}
      ${divider()}
      ${transferSection}
      ${divider()}
      ${row(amountLabel, `${d.currency} ${d.amount}`, true)}
      ${row('Balance', `${d.currency} ${d.balanceAfter}`)}
      ${divider()}
      ${centered('Thank you for banking with us')}
      ${centered('Keep this receipt for your records')}
    `;

    return wrapHtml(body, title);
  }

  private renderRemittance(d: RemittanceReceiptData): string {
    const isPayout = d.status === 'PAID';
    const title = isPayout ? 'REMITTANCE PAYOUT' : 'REMITTANCE SEND';

    const body = `
      ${header(d.senderBranchName)}
      ${divider()}
      ${centered(title)}
      ${divider()}
      ${row('Date', formatDate(d.date))}
      ${row('Time', formatTime(d.date))}
      ${row('Ref', d.reference)}
      ${row('Teller', d.tellerName)}
      ${divider()}
      ${row('Recipient', d.recipientName)}
      ${row('ID Number', d.recipientIdNumber)}
      ${d.recipientPhone ? row('Phone', d.recipientPhone) : ''}
      ${divider()}
      ${row('Amount', `${d.currency} ${d.amount}`, true)}
      ${row('Status', d.status)}
      ${divider()}
      ${centered('Present this receipt to collect')}
      ${centered('your transfer at any branch')}
    `;

    return wrapHtml(body, title);
  }
}

// ---------------------------------------------------------------------------
// HTML helpers — pure functions, no class needed
// ---------------------------------------------------------------------------

function wrapHtml(body: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Receipt — ${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      background: #f0f0f0;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding: 20px;
    }

    .receipt-wrapper {
      background: white;
      width: 80mm;
      padding: 6mm 4mm;
    }

    .receipt-center { text-align: center; }
    .receipt-row { display: flex; justify-content: space-between; margin: 1.5px 0; }
    .receipt-label { color: #555; }
    .receipt-value { text-align: right; max-width: 55%; word-break: break-all; }
    .receipt-value.bold { font-weight: bold; font-size: 14px; }
    .receipt-divider { border: none; border-top: 1px dashed #999; margin: 4px 0; }
    .receipt-title { font-weight: bold; font-size: 13px; letter-spacing: 1px; }
    .receipt-brand { font-weight: bold; font-size: 15px; letter-spacing: 2px; }
    .receipt-sub { font-size: 10px; color: #555; }
    .receipt-footer { font-size: 10px; color: #555; margin-top: 2px; }
    .print-btn {
      display: block;
      margin: 16px auto 0;
      padding: 8px 24px;
      background: #1a56db;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      width: 80mm;
    }
    .print-btn:hover { background: #1e429f; }

    @page { margin: 0; }
    @media print {
      body { background: white; padding: 2mm; display: block; }
      .receipt-wrapper { width: 100%; padding: 2mm; box-shadow: none; }
      .print-btn { display: none !important; }
    }
  </style>
</head>
<body>
  <div>
    <div class="receipt-wrapper">
      ${body}
    </div>
    <button class="print-btn no-print" onclick="window.print()">
      🖨️ Print Receipt
    </button>
  </div>
</body>
</html>`;
}

function header(branchName: string): string {
  return `
    <div class="receipt-center">
      <div class="receipt-brand">CADECO</div>
      <div class="receipt-sub">${branchName}</div>
    </div>
  `;
}

function divider(): string {
  return `<hr class="receipt-divider" />`;
}

function centered(text: string): string {
  return `<div class="receipt-center receipt-footer">${text}</div>`;
}

function row(label: string, value: string, bold = false): string {
  return `
    <div class="receipt-row">
      <span class="receipt-label">${label}</span>
      <span class="receipt-value${bold ? ' bold' : ''}">${value}</span>
    </div>
  `;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Bordereau de Versement d'Espèces
// ---------------------------------------------------------------------------

function renderDepositBordereau(d: {
  reference: string;
  date: Date;
  amount: string;
  currency: string;
  balanceAfter: string;
  accountNumber: string;
  clientName: string;
  tellerName: string;
  branchName: string;
  depositorName?: string;
  depositorPhone?: string;
  denominations?: { denomination: number; quantity: number; subtotal: string }[];
}): string {
  const denoms = d.denominations ?? [];
  const denomTotal = denoms.reduce((sum, dn) => sum + Number(dn.subtotal), 0).toFixed(2);
  const fee = (Number(denomTotal) - Number(d.amount)).toFixed(2);
  const hasFee = Number(fee) > 0;
  const amountWords = numberToFrenchWords(Math.round(Number(denomTotal)));

  const denomRows = denoms
    .map((dn) => row(`${dn.quantity} × ${dn.denomination}`, `${d.currency} ${dn.subtotal}`))
    .join('');

  const body = `
    ${header(d.branchName)}
    ${divider()}
    ${centered('Bordereau de Versement d\'Espèces')}
    ${centered(`N. ${d.reference}`)}
    ${divider()}
    ${row('Date', formatDate(d.date))}
    ${row('Heure', formatTime(d.date))}
    ${row('Caissier', d.tellerName)}
    ${divider()}
    ${row('Versé par', d.depositorName ?? '—')}
    ${d.depositorPhone ? row('Adresse', d.depositorPhone) : ''}
    ${divider()}
    ${centered('Pour le crédit du compte')}
    ${row('N°', d.accountNumber)}
    ${row('de', d.clientName)}
    ${divider()}
    ${centered('Détail Versement')}
    ${denomRows}
    ${divider()}
    ${row('Montant du Versement', `${d.currency} ${denomTotal}`, true)}
    ${hasFee ? row('dont frais de service', `${d.currency} ${fee}`) : ''}
    ${row('Solde après', `${d.currency} ${d.balanceAfter}`)}
    ${divider()}
    ${centered('La somme de')}
    ${centered(`${d.currency} ${amountWords}`)}
    ${divider()}
    ${centered('Signature du Déposant')}
    ${centered('_______________________')}
  `;

  return wrapHtml(body, "Bordereau de Versement d'Espèces");
}

// ---------------------------------------------------------------------------
// Bordereau de Retrait d'Espèces
// ---------------------------------------------------------------------------

function renderWithdrawalReceipt(d: {
  reference: string;
  date: Date;
  amount: string;
  currency: string;
  balanceAfter: string;
  accountNumber: string;
  clientName: string;
  tellerName: string;
  branchName: string;
  denominations?: { denomination: number; quantity: number; subtotal: string }[];
}): string {
  const denoms = d.denominations ?? [];
  const feeAmount = denoms.length > 0
    ? Math.max(0, Number(d.amount) - denoms.reduce((s, dn) => s + Number(dn.subtotal), 0))
    : 0;
  const hasFee = feeAmount > 0;
  const netPayout = hasFee
    ? (Number(d.amount) - feeAmount).toFixed(2)
    : d.amount;

  const denomRows = denoms
    .map((dn) => row(`${dn.quantity} × ${dn.denomination}`, `${d.currency} ${dn.subtotal}`))
    .join('');

  const body = `
    ${header(d.branchName)}
    ${divider()}
    ${centered('Bordereau de Retrait d\'Espèces')}
    ${centered(`N. ${d.reference}`)}
    ${divider()}
    ${row('Date', formatDate(d.date))}
    ${row('Heure', formatTime(d.date))}
    ${row('Caissier', d.tellerName)}
    ${divider()}
    ${row('N° Compte', d.accountNumber)}
    ${row('Titulaire', d.clientName)}
    ${divider()}
    ${denoms.length > 0 ? centered('Détail Retrait') : ''}
    ${denomRows}
    ${denoms.length > 0 ? divider() : ''}
    ${row('Montant du Retrait', `${d.currency} ${d.amount}`, true)}
    ${hasFee ? row('dont frais de service', `${d.currency} ${feeAmount.toFixed(2)}`) : ''}
    ${hasFee ? row('Montant reçu', `${d.currency} ${netPayout}`, true) : ''}
    ${row('Solde après', `${d.currency} ${d.balanceAfter}`)}
    ${divider()}
    ${centered('Merci de votre confiance')}
  `;

  return wrapHtml(body, "Bordereau de Retrait d'Espèces");
}

function numberToFrenchWords(n: number): string {
  if (n === 0) return 'zéro';
  if (n < 0) return 'moins ' + numberToFrenchWords(-n);

  const ones = [
    '', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
    'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
    'dix-sept', 'dix-huit', 'dix-neuf',
  ];

  if (n < 20) return ones[n];

  if (n < 70) {
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return tens[t];
    if (u === 1) return tens[t] + ' et un';
    return tens[t] + '-' + ones[u];
  }

  if (n < 80) {
    const r = n - 60;
    if (r === 11) return 'soixante et onze';
    return 'soixante-' + ones[r];
  }

  if (n < 100) {
    const r = n - 80;
    if (r === 0) return 'quatre-vingts';
    return 'quatre-vingt-' + ones[r];
  }

  if (n < 200) {
    const r = n - 100;
    return r === 0 ? 'cent' : 'cent ' + numberToFrenchWords(r);
  }

  if (n < 1000) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    const hWord = ones[h] + ' cent';
    return r === 0 ? hWord + 's' : hWord + ' ' + numberToFrenchWords(r);
  }

  if (n < 2000) {
    const r = n - 1000;
    return r === 0 ? 'mille' : 'mille ' + numberToFrenchWords(r);
  }

  if (n < 1_000_000) {
    const t = Math.floor(n / 1000);
    const r = n % 1000;
    const tWord = numberToFrenchWords(t) + ' mille';
    return r === 0 ? tWord : tWord + ' ' + numberToFrenchWords(r);
  }

  if (n < 1_000_000_000) {
    const m = Math.floor(n / 1_000_000);
    const r = n % 1_000_000;
    const mWord = numberToFrenchWords(m) + (m > 1 ? ' millions' : ' million');
    return r === 0 ? mWord : mWord + ' ' + numberToFrenchWords(r);
  }

  const b = Math.floor(n / 1_000_000_000);
  const r = n % 1_000_000_000;
  const bWord = numberToFrenchWords(b) + (b > 1 ? ' milliards' : ' milliard');
  return r === 0 ? bWord : bWord + ' ' + numberToFrenchWords(r);
}
