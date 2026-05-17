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

export interface InvitationPayload {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  token: string;
  expiresAt: Date;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter {
    if (this.transporter) return this.transporter;

    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      throw new Error('SMTP configuration missing');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });

    return this.transporter;
  }

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

  async sendInvitationEmail(payload: InvitationPayload): Promise<void> {
    const host = this.config.get<string>('SMTP_HOST');
    const port = this.config.get<number>('SMTP_PORT', 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const from = this.config.get<string>('SMTP_FROM', `"MicroFinance" <${user}>`);
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');

    if (!host || !user || !pass) {
      this.logger.warn('Email not configured (SMTP_HOST / SMTP_USER / SMTP_PASS missing) — cannot send invitation.');
      return;
    }

    const activationUrl = `${frontendUrl}/auth/set-password/${payload.token}`;
    const expiresDate = payload.expiresAt.toLocaleDateString();

    try {
      const transporter = this.getTransporter();

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            .body { font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f4f7f9; padding: 40px 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
            .header { background: #004a99; padding: 30px; text-align: center; color: #ffffff; }
            .content { padding: 40px; color: #333333; line-height: 1.6; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background: #004a99; color: #ffffff !important; padding: 14px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
            .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 12px; }
            .role-badge { background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          </style>
        </head>
        <body class="body">
          <div class="container">
            <div class="header">
              <h1 style="margin:0; font-size: 24px;">MicroFinance System</h1>
            </div>
            <div class="content">
              <h2 style="margin-top:0;">Welcome to the Team, ${payload.firstName}!</h2>
              <p>You have been invited to join the MicroFinance management system as a <span class="role-badge">${payload.role}</span>.</p>
              <p>To get started, you need to set your account password. This link will expire on <strong>${expiresDate}</strong>.</p>
              
              <div class="button-container">
                <a href="${activationUrl}" class="button">Set My Password</a>
              </div>
              
              <p style="font-size: 14px; color: #666;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="font-size: 13px; color: #004a99; word-break: break-all;">${activationUrl}</p>
            </div>
            <div class="footer">
              <p>&copy; 2026 MicroFinance Solutions. All rights reserved.</p>
              <p>This is an automated message, please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await transporter.sendMail({
        from,
        to: payload.email,
        subject: `Account Invitation — Welcome to MicroFinance`,
        html,
      });

      this.logger.log(`Invitation email sent successfully to ${payload.email}`);
    } catch (err) {
      this.logger.error(`Failed to send invitation email to ${payload.email}: ${err.message}`);
      throw err;
    }
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
      const transporter = this.getTransporter();
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
