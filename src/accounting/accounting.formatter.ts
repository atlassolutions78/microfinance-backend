import type { Response } from 'express';
import type {
  BalanceSheetRecord,
  BalanceSheetSectionRecord,
  GeneralLedgerAccountRecord,
  IncomeStatementRecord,
  TrialBalanceRecord,
} from './accounting.mapper';

export class AccountingFormatter {
  // ── Public: route handler helper ──────────────────────────────────────────────

  /**
   * Sends the appropriate response based on the `format` query param.
   *   format=html  → text/html (browser opens, user prints to PDF)
   *   format=csv   → text/csv  (browser downloads, opens in Excel)
   *   default      → JSON
   */
  static respond(
    res: Response,
    format: string | undefined,
    jsonData: unknown,
    htmlFn: () => string,
    csvFn: () => string,
    csvFilename: string,
  ): void {
    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(htmlFn());
      return;
    }
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${csvFilename}"`);
      res.send(csvFn());
      return;
    }
    res.json(jsonData);
  }

  // ── HTML generators ───────────────────────────────────────────────────────────

  static trialBalanceHtml(
    data: TrialBalanceRecord,
    currency?: string,
    branchId?: string,
  ): string {
    const filters = [
      `As of: <strong>${AccountingFormatter.dateStr(data.asOf)}</strong>`,
      `Currency: <strong>${currency ?? 'All'}</strong>`,
      branchId ? `Branch ID: <strong>${AccountingFormatter.esc(branchId)}</strong>` : 'All Branches',
    ].join(' &nbsp;|&nbsp; ');

    const rows = data.lines.map((l) => `
      <tr>
        <td>${AccountingFormatter.esc(l.code)}</td>
        <td>${AccountingFormatter.esc(l.name)}</td>
        <td>${l.type}</td>
        <td class="num">${AccountingFormatter.fmt(l.totalDebit)}</td>
        <td class="num">${AccountingFormatter.fmt(l.totalCredit)}</td>
        <td class="num">${AccountingFormatter.fmt(l.balance)}</td>
      </tr>`).join('');

    const content = `
      <table>
        <thead>
          <tr>
            <th>Code</th><th>Account Name</th><th>Type</th>
            <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="totals">
            <td colspan="3">TOTAL</td>
            <td class="num">${AccountingFormatter.fmt(data.totalDebits)}</td>
            <td class="num">${AccountingFormatter.fmt(data.totalCredits)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
      <p class="status">
        Balanced: <span class="${data.isBalanced ? 'ok' : 'err'}">${data.isBalanced ? 'YES ✓' : 'NO ✗'}</span>
      </p>`;

    return AccountingFormatter.baseHtml('Trial Balance', filters, content);
  }

  static generalLedgerHtml(
    data: GeneralLedgerAccountRecord[],
    currency?: string,
    from?: Date,
    to?: Date,
    branchId?: string,
  ): string {
    const period =
      from && to ? `${AccountingFormatter.dateStr(from)} – ${AccountingFormatter.dateStr(to)}`
      : from     ? `From ${AccountingFormatter.dateStr(from)}`
      : to       ? `Up to ${AccountingFormatter.dateStr(to)}`
      :            'All time';

    const filters = [
      `Period: <strong>${period}</strong>`,
      `Currency: <strong>${currency ?? 'All'}</strong>`,
      branchId ? `Branch ID: <strong>${AccountingFormatter.esc(branchId)}</strong>` : 'All Branches',
    ].join(' &nbsp;|&nbsp; ');

    const sections = data.map((acct) => {
      const lines = acct.lines.map((l) => `
        <tr>
          <td>${AccountingFormatter.dateStr(l.date)}</td>
          <td>${AccountingFormatter.esc(l.reference)}</td>
          <td>${AccountingFormatter.esc(l.description ?? '')}</td>
          <td class="num">${Number(l.debit) > 0 ? AccountingFormatter.fmt(l.debit) : ''}</td>
          <td class="num">${Number(l.credit) > 0 ? AccountingFormatter.fmt(l.credit) : ''}</td>
          <td class="num">${AccountingFormatter.fmt(l.runningBalance)}</td>
          <td>${l.currency}</td>
        </tr>`).join('');

      return `
        <tr class="section-header">
          <td colspan="7">${AccountingFormatter.esc(acct.code)} — ${AccountingFormatter.esc(acct.name)} &nbsp;(${acct.type})</td>
        </tr>
        ${lines}
        <tr class="subtotal">
          <td colspan="3" style="text-align:right;font-style:italic">Account total</td>
          <td class="num"><strong>${AccountingFormatter.fmt(acct.totalDebit)}</strong></td>
          <td class="num"><strong>${AccountingFormatter.fmt(acct.totalCredit)}</strong></td>
          <td class="num"><strong>${AccountingFormatter.fmt(acct.closingBalance)}</strong></td>
          <td></td>
        </tr>`;
    }).join('');

    const content = `
      <table>
        <thead>
          <tr>
            <th>Date</th><th>Reference</th><th>Description</th>
            <th class="num">Debit</th><th class="num">Credit</th>
            <th class="num">Running Balance</th><th>Currency</th>
          </tr>
        </thead>
        <tbody>${sections}</tbody>
      </table>`;

    return AccountingFormatter.baseHtml('General Ledger', filters, content);
  }

  static balanceSheetHtml(
    data: BalanceSheetRecord,
    currency?: string,
    branchId?: string,
  ): string {
    const filters = [
      `As of: <strong>${AccountingFormatter.dateStr(data.asOf)}</strong>`,
      `Currency: <strong>${currency ?? 'All'}</strong>`,
      branchId ? `Branch ID: <strong>${AccountingFormatter.esc(branchId)}</strong>` : 'All Branches',
    ].join(' &nbsp;|&nbsp; ');

    const renderSection = (title: string, section: BalanceSheetSectionRecord) => {
      const rows = section.accounts.map((a) => `
        <tr>
          <td>${AccountingFormatter.esc(a.code)}</td>
          <td>${AccountingFormatter.esc(a.name)}</td>
          <td class="num">${AccountingFormatter.fmt(a.balance)}</td>
        </tr>`).join('');
      return `
        <tr class="section-header"><td colspan="3">${title}</td></tr>
        ${rows}
        <tr class="subtotal">
          <td colspan="2" style="text-align:right;font-style:italic">Total ${title}</td>
          <td class="num"><strong>${AccountingFormatter.fmt(section.total)}</strong></td>
        </tr>`;
    };

    const content = `
      <table>
        <thead>
          <tr><th>Code</th><th>Account Name</th><th class="num">Balance</th></tr>
        </thead>
        <tbody>
          ${renderSection('ASSETS', data.assets)}
          ${renderSection('LIABILITIES', data.liabilities)}
          ${renderSection('EQUITY', data.equity)}
        </tbody>
        <tfoot>
          <tr class="totals"><td colspan="2">TOTAL ASSETS</td><td class="num">${AccountingFormatter.fmt(data.assets.total)}</td></tr>
          <tr class="totals"><td colspan="2">TOTAL LIABILITIES + EQUITY</td><td class="num">${AccountingFormatter.fmt(data.totalLiabilitiesAndEquity)}</td></tr>
        </tfoot>
      </table>
      <p class="status">
        Balanced: <span class="${data.isBalanced ? 'ok' : 'err'}">${data.isBalanced ? 'YES ✓' : 'NO ✗'}</span>
      </p>`;

    return AccountingFormatter.baseHtml('Balance Sheet', filters, content);
  }

  static incomeStatementHtml(
    data: IncomeStatementRecord,
    currency?: string,
    branchId?: string,
  ): string {
    const filters = [
      `Period: <strong>${AccountingFormatter.dateStr(data.from)} – ${AccountingFormatter.dateStr(data.to)}</strong>`,
      `Currency: <strong>${currency ?? 'All'}</strong>`,
      branchId ? `Branch ID: <strong>${AccountingFormatter.esc(branchId)}</strong>` : 'All Branches',
    ].join(' &nbsp;|&nbsp; ');

    const renderSection = (
      title: string,
      accounts: IncomeStatementRecord['income']['accounts'],
      total: string,
    ) => {
      const rows = accounts.map((a) => `
        <tr>
          <td>${AccountingFormatter.esc(a.code)}</td>
          <td>${AccountingFormatter.esc(a.name)}</td>
          <td class="num">${AccountingFormatter.fmt(a.amount)}</td>
        </tr>`).join('');
      return `
        <tr class="section-header"><td colspan="3">${title}</td></tr>
        ${rows}
        <tr class="subtotal">
          <td colspan="2" style="text-align:right;font-style:italic">Total ${title}</td>
          <td class="num"><strong>${AccountingFormatter.fmt(total)}</strong></td>
        </tr>`;
    };

    const netPositive = parseFloat(data.netProfit) >= 0;

    const content = `
      <table>
        <thead>
          <tr><th>Code</th><th>Account Name</th><th class="num">Amount</th></tr>
        </thead>
        <tbody>
          ${renderSection('INCOME', data.income.accounts, data.income.total)}
          ${renderSection('EXPENSES', data.expenses.accounts, data.expenses.total)}
        </tbody>
        <tfoot>
          <tr class="totals">
            <td colspan="2">NET ${netPositive ? 'PROFIT' : 'LOSS'}</td>
            <td class="num">${AccountingFormatter.fmt(data.netProfit)}</td>
          </tr>
        </tfoot>
      </table>`;

    return AccountingFormatter.baseHtml('Income Statement', filters, content);
  }

  // ── CSV generators ────────────────────────────────────────────────────────────

  static trialBalanceCsv(data: TrialBalanceRecord): string {
    const rows: string[][] = [
      ['Code', 'Account Name', 'Type', 'Total Debit', 'Total Credit', 'Balance', 'Normal Balance'],
      ...data.lines.map((l) => [l.code, l.name, l.type, l.totalDebit, l.totalCredit, l.balance, l.normalBalance]),
      [],
      ['', '', 'TOTAL', data.totalDebits, data.totalCredits, '', data.isBalanced ? 'BALANCED' : 'UNBALANCED'],
    ];
    return AccountingFormatter.toCsv(rows);
  }

  static generalLedgerCsv(data: GeneralLedgerAccountRecord[]): string {
    const rows: string[][] = [
      ['Account Code', 'Account Name', 'Date', 'Reference', 'Description', 'Debit', 'Credit', 'Running Balance', 'Currency'],
    ];
    for (const acct of data) {
      for (const l of acct.lines) {
        rows.push([
          acct.code, acct.name,
          AccountingFormatter.dateStr(l.date),
          l.reference, l.description ?? '',
          l.debit, l.credit, l.runningBalance, l.currency,
        ]);
      }
      rows.push(['', '', '', '', 'Account Total', acct.totalDebit, acct.totalCredit, acct.closingBalance, '']);
      rows.push([]);
    }
    return AccountingFormatter.toCsv(rows);
  }

  static balanceSheetCsv(data: BalanceSheetRecord): string {
    const rows: string[][] = [['Section', 'Code', 'Account Name', 'Balance']];
    const sections: Array<[string, BalanceSheetSectionRecord]> = [
      ['ASSETS', data.assets],
      ['LIABILITIES', data.liabilities],
      ['EQUITY', data.equity],
    ];
    for (const [label, section] of sections) {
      for (const a of section.accounts) rows.push([label, a.code, a.name, a.balance]);
      rows.push([`${label} TOTAL`, '', '', section.total]);
      rows.push([]);
    }
    rows.push(['TOTAL ASSETS', '', '', data.assets.total]);
    rows.push(['TOTAL LIABILITIES + EQUITY', '', '', data.totalLiabilitiesAndEquity]);
    rows.push(['BALANCED', '', '', data.isBalanced ? 'YES' : 'NO']);
    return AccountingFormatter.toCsv(rows);
  }

  static incomeStatementCsv(data: IncomeStatementRecord): string {
    const rows: string[][] = [['Section', 'Code', 'Account Name', 'Amount']];
    for (const a of data.income.accounts) rows.push(['INCOME', a.code, a.name, a.amount]);
    rows.push(['INCOME TOTAL', '', '', data.income.total]);
    rows.push([]);
    for (const a of data.expenses.accounts) rows.push(['EXPENSES', a.code, a.name, a.amount]);
    rows.push(['EXPENSES TOTAL', '', '', data.expenses.total]);
    rows.push([]);
    rows.push([`NET ${parseFloat(data.netProfit) >= 0 ? 'PROFIT' : 'LOSS'}`, '', '', data.netProfit]);
    return AccountingFormatter.toCsv(rows);
  }

  // ── Private helpers ───────────────────────────────────────────────────────────

  private static dateStr(d: Date): string {
    return new Date(d).toISOString().split('T')[0];
  }

  /** Formats a monetary string with thousands separators for display. */
  private static fmt(n: string | number): string {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Escapes HTML special characters. */
  private static esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Wraps a CSV cell value in quotes if it contains commas, quotes, or newlines. */
  private static csvCell(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  private static toCsv(rows: string[][]): string {
    return rows
      .map((r) => r.map((v) => AccountingFormatter.csvCell(String(v ?? ''))).join(','))
      .join('\r\n');
  }

  private static baseHtml(title: string, filters: string, content: string): string {
    const now = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CADECO – ${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff;padding:28px}
.hdr{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #1a3c5e;padding-bottom:12px;margin-bottom:14px}
.hdr-l h2{font-size:12px;letter-spacing:1px;color:#888;text-transform:uppercase;margin-bottom:2px}
.hdr-l h1{font-size:20px;color:#1a3c5e;font-weight:700}
.hdr-r{font-size:11px;color:#999}
.filters{font-size:12px;color:#444;margin-bottom:16px}
table{width:100%;border-collapse:collapse}
thead th{background:#1a3c5e;color:#fff;padding:8px 10px;font-size:12px;text-align:left}
thead th.num{text-align:right}
tbody tr:nth-child(even){background:#f7f9fb}
tbody td{padding:6px 10px;border-bottom:1px solid #eee;vertical-align:top}
td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
tr.section-header td{background:#dce6f0;color:#1a3c5e;font-weight:700;padding:8px 10px;font-size:12px}
tr.subtotal td{background:#eef2f7;padding:6px 10px}
tfoot tr.totals td{background:#1a3c5e;color:#fff;font-weight:700;padding:8px 10px}
tfoot tr.totals td.num{text-align:right}
.status{margin-top:12px;font-size:13px}
.ok{color:#2e7d32;font-weight:600}
.err{color:#c62828;font-weight:600}
@page{margin:0}
@media print{
  body{padding:12mm 15mm;font-size:11px}
  thead th,tr.section-header td,tfoot tr.totals td,tbody tr:nth-child(even),tr.subtotal td{
    -webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>
<div class="hdr">
  <div class="hdr-l"><h2>CADECO</h2><h1>${title}</h1></div>
  <div class="hdr-r">Generated: ${now}</div>
</div>
<p class="filters">${filters}</p>
${content}
</body>
</html>`;
  }
}
