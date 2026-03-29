import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import twilio from 'twilio';
import { NotificationChannel, NotificationStatus } from './notifications.enums';

export interface LoanReminderPayload {
  loanNumber: string;
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  currency: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
}

export interface ReminderResult {
  channel: NotificationChannel;
  status: NotificationStatus;
  errorMessage: string | null;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Sends a loan overdue reminder via every configured channel (email and/or SMS).
   * Channels with missing configuration are skipped rather than throwing.
   */
  async sendLoanReminder(payload: LoanReminderPayload): Promise<ReminderResult[]> {
    const results: ReminderResult[] = [];

    if (payload.clientEmail) {
      results.push(await this.sendEmail(payload));
    }

    if (payload.clientPhone) {
      results.push(await this.sendSms(payload));
    }

    if (results.length === 0) {
      this.logger.warn(
        `No contact channels available for loan ${payload.loanNumber} installment #${payload.installmentNumber}`,
      );
    }

    return results;
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async sendEmail(payload: LoanReminderPayload): Promise<ReminderResult> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM', user ?? 'noreply@mfi.local');

    if (!host || !user || !pass) {
      this.logger.warn('Email not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing) — skipping email reminder.');
      return {
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.FAILED,
        errorMessage: 'SMTP not configured',
      };
    }

    try {
      const transporter = nodemailer.createTransport({ host, port, auth: { user, pass } });
      const dueDateStr = payload.dueDate.toISOString().split('T')[0];
      await transporter.sendMail({
        from,
        to: payload.clientEmail,
        subject: `Loan Repayment Reminder — ${payload.loanNumber}`,
        text: [
          `Dear ${payload.clientName ?? 'Valued Client'},`,
          '',
          `This is a reminder that installment #${payload.installmentNumber} of loan ${payload.loanNumber} `,
          `was due on ${dueDateStr} for ${payload.amount} ${payload.currency}.`,
          '',
          'Please make payment as soon as possible to avoid a penalty.',
          '',
          'Thank you,',
          'Microfinance Institution',
        ].join('\n'),
      });

      return { channel: NotificationChannel.EMAIL, status: NotificationStatus.SENT, errorMessage: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Email reminder failed for loan ${payload.loanNumber}: ${message}`);
      return { channel: NotificationChannel.EMAIL, status: NotificationStatus.FAILED, errorMessage: message };
    }
  }

  private async sendSms(payload: LoanReminderPayload): Promise<ReminderResult> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken  = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const from       = this.config.get<string>('TWILIO_FROM');

    if (!accountSid || !authToken || !from) {
      this.logger.warn('SMS not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM missing) — skipping SMS reminder.');
      return {
        channel: NotificationChannel.SMS,
        status: NotificationStatus.FAILED,
        errorMessage: 'Twilio not configured',
      };
    }

    try {
      const client = twilio(accountSid, authToken);
      const dueDateStr = payload.dueDate.toISOString().split('T')[0];
      await client.messages.create({
        from,
        to: payload.clientPhone!,
        body: `Reminder: Loan ${payload.loanNumber} installment #${payload.installmentNumber} of ${payload.amount} ${payload.currency} was due on ${dueDateStr}. Please pay to avoid penalty.`,
      });

      return { channel: NotificationChannel.SMS, status: NotificationStatus.SENT, errorMessage: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`SMS reminder failed for loan ${payload.loanNumber}: ${message}`);
      return { channel: NotificationChannel.SMS, status: NotificationStatus.FAILED, errorMessage: message };
    }
  }
}
