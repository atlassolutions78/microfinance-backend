import type { Response } from 'express';
import type { AccountStatementRecord } from './account.mapper';

export class AccountFormatter {
  // ── Public: route handler helper ──────────────────────────────────────────────

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

  // ── HTML ──────────────────────────────────────────────────────────────────────

  static statementHtml(data: AccountStatementRecord): string {
    const { account, client, period, openingBalance, closingBalance, transactions } = data;

    const txRows = transactions.map((t, i) => `
      <tr class="${i % 2 === 1 ? 'alt' : ''}">
        <td>${AccountFormatter.dateStr(t.date)}</td>
        <td>${AccountFormatter.dateStr(t.date)}</td>
        <td class="ref">${AccountFormatter.esc(t.reference)}</td>
        <td>${AccountFormatter.esc(t.description ?? '')}</td>
        <td class="num">${t.debit  !== '0.00' ? AccountFormatter.fmt(t.debit)  : ''}</td>
        <td class="num">${t.credit !== '0.00' ? AccountFormatter.fmt(t.credit) : ''}</td>
        <td class="num bal">${AccountFormatter.fmt(t.balance)}</td>
      </tr>`).join('');

    const noTx = transactions.length === 0
      ? `<tr><td colspan="7" class="empty">No transactions recorded in this period.</td></tr>`
      : '';

    const net = (Number(closingBalance) - Number(openingBalance)).toFixed(2);
    const netLabel = Number(net) >= 0 ? 'Net Credit' : 'Net Debit';
    const netAbs = AccountFormatter.fmt(Math.abs(Number(net)).toFixed(2));

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CADECO – Account Statement</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#000;background:#fff;padding:24px 32px;max-width:900px;margin:0 auto}

/* ── Bank header ── */
.bank-header{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px}
.bank-name{font-size:22px;font-weight:700;color:#003366;letter-spacing:.5px;line-height:1}
.stmt-label{text-align:right}
.stmt-label .title{font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#003366}
.stmt-label .generated{font-size:10px;color:#777;margin-top:4px}

.top-rule{border:none;border-top:2px solid #003366;margin:0 0 14px}
.bottom-rule{border:none;border-top:1px solid #bbb;margin:14px 0 0}

/* ── Info boxes ── */
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:14px;border:1px solid #ccc}
.info-box{padding:10px 14px}
.info-box + .info-box{border-left:1px solid #ccc}
.info-box .box-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#003366;border-bottom:1px solid #e0e0e0;padding-bottom:5px;margin-bottom:8px}
.info-row{display:flex;justify-content:space-between;margin-bottom:4px;font-size:11px}
.info-row .lbl{color:#555}
.info-row .val{font-weight:600;color:#000;text-align:right}

/* ── Balance summary bar ── */
.bal-bar{display:grid;grid-template-columns:1fr 1fr 1fr;border:1px solid #ccc;margin-bottom:14px}
.bal-cell{padding:8px 14px;text-align:center}
.bal-cell + .bal-cell{border-left:1px solid #ccc}
.bal-cell .bl{font-size:10px;color:#555;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
.bal-cell .bv{font-size:13px;font-weight:700;color:#003366;font-variant-numeric:tabular-nums}

/* ── Transaction table ── */
table{width:100%;border-collapse:collapse;font-size:11px}
thead tr{background:#003366}
thead th{color:#fff;padding:7px 8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.4px;font-weight:600;border-right:1px solid #1a5080}
thead th:last-child{border-right:none}
thead th.num{text-align:right}
tbody td{padding:6px 8px;border-bottom:1px solid #e8e8e8;vertical-align:middle;border-right:1px solid #f0f0f0}
tbody td:last-child{border-right:none}
tr.alt td{background:#f7f9fc}
td.num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
td.bal{font-weight:600}
td.ref{font-family:'Courier New',monospace;font-size:10px;color:#444}
td.empty{text-align:center;color:#999;padding:20px;font-style:italic;border-right:none}

/* ── Totals footer row ── */
tfoot tr{background:#f0f4f8}
tfoot td{padding:7px 8px;font-size:11px;font-weight:700;border-top:2px solid #003366;border-right:1px solid #d0d8e0}
tfoot td:last-child{border-right:none}
tfoot td.num{text-align:right;font-variant-numeric:tabular-nums}

/* ── Closing note ── */
.closing-note{margin-top:14px;font-size:10px;color:#777;border-top:1px solid #ddd;padding-top:10px;display:flex;justify-content:space-between}

/* ── Print button ── */
.print-btn{display:block;margin:20px auto 0;background:#003366;color:#fff;border:none;padding:10px 28px;font-size:12px;cursor:pointer;letter-spacing:.5px}
.print-btn:hover{background:#00509e}

@page{margin:0}
@media print{
  body{padding:10mm 14mm;max-width:none}
  .print-btn{display:none}
  thead tr,.bal-bar,.bal-cell,.info-box{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
</style>
</head>
<body>

<div class="bank-header">
  <div>
    <div class="bank-name">CADECO</div>
  </div>
  <div class="stmt-label">
    <div class="title">Statement of Account</div>
    <div class="generated">Printed: ${AccountFormatter.dateStr(new Date())}</div>
  </div>
</div>

<hr class="top-rule">

<div class="info-grid">
  <div class="info-box">
    <div class="box-title">Account Details</div>
    <div class="info-row"><span class="lbl">Account Number</span><span class="val">${AccountFormatter.esc(account.accountNumber)}</span></div>
    <div class="info-row"><span class="lbl">Account Type</span><span class="val">${account.type}</span></div>
    <div class="info-row"><span class="lbl">Currency</span><span class="val">${account.currency}</span></div>
    <div class="info-row"><span class="lbl">Statement Period</span><span class="val">${AccountFormatter.dateStr(period.from)} to ${AccountFormatter.dateStr(period.to)}</span></div>
  </div>
  <div class="info-box">
    <div class="box-title">Customer Details</div>
    <div class="info-row"><span class="lbl">Customer Name</span><span class="val">${AccountFormatter.esc(client.name)}</span></div>
    <div class="info-row"><span class="lbl">Customer Number</span><span class="val">${AccountFormatter.esc(client.clientNumber)}</span></div>
  </div>
</div>

<div class="bal-bar">
  <div class="bal-cell">
    <div class="bl">Opening Balance</div>
    <div class="bv">${account.currency} ${AccountFormatter.fmt(openingBalance)}</div>
  </div>
  <div class="bal-cell">
    <div class="bl">Closing Balance</div>
    <div class="bv">${account.currency} ${AccountFormatter.fmt(closingBalance)}</div>
  </div>
  <div class="bal-cell">
    <div class="bl">${netLabel}</div>
    <div class="bv">${account.currency} ${netAbs}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th>Txn Date</th>
      <th>Value Date</th>
      <th>Reference</th>
      <th>Description</th>
      <th class="num">Debit (${account.currency})</th>
      <th class="num">Credit (${account.currency})</th>
      <th class="num">Balance (${account.currency})</th>
    </tr>
  </thead>
  <tbody>
    ${txRows}${noTx}
  </tbody>
  <tfoot>
    <tr>
      <td colspan="4">Closing Balance</td>
      <td class="num"></td>
      <td class="num"></td>
      <td class="num">${AccountFormatter.fmt(closingBalance)}</td>
    </tr>
  </tfoot>
</table>

<div class="closing-note">
  <span>CADECO — This is a computer-generated statement and requires no signature.</span>
  <span>For queries, contact your branch or call customer services.</span>
</div>

<button class="print-btn" onclick="window.print()">&#x1F5A8; Print / Save as PDF</button>
</body>
</html>`;
  }

  // ── CSV ───────────────────────────────────────────────────────────────────────

  static statementCsv(data: AccountStatementRecord): string {
    const { account, client, period, openingBalance, closingBalance, transactions } = data;

    const rows: string[][] = [
      ['CADECO – Account Statement'],
      [],
      ['Client Name',    client.name],
      ['Client Number',  client.clientNumber],
      ['Account Number', account.accountNumber],
      ['Account Type',   account.type],
      ['Currency',       account.currency],
      ['Period',         `${AccountFormatter.dateStr(period.from)} to ${AccountFormatter.dateStr(period.to)}`],
      ['Opening Balance', openingBalance],
      [],
      ['Date', 'Reference', 'Description', 'Debit', 'Credit', 'Balance'],
      ...transactions.map((t) => [
        AccountFormatter.dateStr(t.date),
        t.reference,
        t.description ?? '',
        t.debit  !== '0.00' ? t.debit  : '',
        t.credit !== '0.00' ? t.credit : '',
        t.balance,
      ]),
      [],
      ['Closing Balance', closingBalance],
    ];

    return rows
      .map((r) => r.map((v) => AccountFormatter.csvCell(String(v ?? ''))).join(','))
      .join('\r\n');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private static dateStr(d: Date): string {
    return new Date(d).toISOString().split('T')[0];
  }

  private static fmt(n: string | number): string {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private static esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private static csvCell(val: string): string {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }
}
