import { registerAs } from '@nestjs/config';

export default registerAs('mailtrap', () => ({
  // Optional for old SMTP-based setup
  host: process.env.MAILTRAP_HOST,
  port: parseInt(process.env.MAILTRAP_PORT, 10),
  user: process.env.MAILTRAP_USER,
  pass: process.env.MAILTRAP_PASS,

  // Required for Mailtrap API
  token: process.env.MAILTRAP_API_TOKEN,
  accountId: process.env.MAILTRAP_ACCOUNT_ID,
  inboxId: process.env.MAILTRAP_INBOX_ID,

  // General settings
  fromEmail: process.env.FROM_EMAIL,
  fromName: process.env.FROM_NAME,
}));

// // src/providers/mailtrap/mailtrap.config.ts
// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';

// export interface MailtrapSMTPConfig {
//   host: string;
//   port: number;
//   secure: boolean;
//   auth: {
//     user: string;
//     pass: string;
//   };
// }

// export interface MailtrapAPIConfig {
//   apiToken: string;
//   accountId: string;
//   inboxId: string;
//   apiUrl: string;
// }

// export interface MailtrapWebhookConfig {
//   secret: string;
//   endpoint: string;
// }

// export interface MailtrapEmailConfig {
//   fromEmail: string;
//   fromName: string;
//   replyTo?: string;
// }

// export interface MailtrapConfig {
//   smtp: MailtrapSMTPConfig;
//   api: MailtrapAPIConfig;
//   webhook: MailtrapWebhookConfig;
//   email: MailtrapEmailConfig;
//   environment: 'sandbox' | 'production';
// }

// @Injectable()
// export class MailtrapConfigService {
//   private readonly config: MailtrapConfig;

//   constructor(private readonly configService: ConfigService) {
//     this.config = this.loadConfig();
//   }

//   private loadConfig(): MailtrapConfig {
//     const environment = this.configService.get<string>('NODE_ENV', 'development');
//     const isProduction = environment === 'production';

//     return {
//       smtp: {
//         host: this.configService.get<string>('MAILTRAP_HOST', 'sandbox.smtp.mailtrap.io'),
//         port: this.configService.get<number>('MAILTRAP_PORT', 2525),
//         secure: false, // Mailtrap uses STARTTLS, not SSL
//         auth: {
//           user: this.configService.getOrThrow<string>('MAILTRAP_USER'),
//           pass: this.configService.getOrThrow<string>('MAILTRAP_PASS'),
//         },
//       },
      
//       api: {
//         apiToken: this.configService.get<string>('MAILTRAP_API_TOKEN', ''),
//         accountId: this.configService.get<string>('MAILTRAP_ACCOUNT_ID', ''),
//         inboxId: this.configService.get<string>('MAILTRAP_INBOX_ID', ''),
//         apiUrl: isProduction 
//           ? 'https://send.api.mailtrap.io' 
//           : 'https://mailtrap.io/api',
//       },
      
//       webhook: {
//         secret: this.configService.get<string>('MAILTRAP_WEBHOOK_SECRET', ''),
//         endpoint: this.configService.get<string>('WEBHOOK_ENDPOINT', '/webhooks/mailtrap'),
//       },
      
//       email: {
//         fromEmail: this.configService.get<string>('FROM_EMAIL', 'noreply@yourapp.com'),
//         fromName: this.configService.get<string>('FROM_NAME', 'Your App'),
//         replyTo: this.configService.get<string>('REPLY_TO_EMAIL'),
//       },
      
//       environment: isProduction ? 'production' : 'sandbox',
//     };
//   }

//   getConfig(): MailtrapConfig {
//     return this.config;
//   }

//   getSMTPConfig(): MailtrapSMTPConfig {
//     return this.config.smtp;
//   }

//   getAPIConfig(): MailtrapAPIConfig {
//     return this.config.api;
//   }

//   getWebhookConfig(): MailtrapWebhookConfig {
//     return this.config.webhook;
//   }

//   getEmailConfig(): MailtrapEmailConfig {
//     return this.config.email;
//   }

//   isProduction(): boolean {
//     return this.config.environment === 'production';
//   }

//   isSandbox(): boolean {
//     return this.config.environment === 'sandbox';
//   }

//   // Validation methods
//   validateSMTPConfig(): boolean {
//     const smtp = this.config.smtp;
//     return !!(smtp.host && smtp.port && smtp.auth.user && smtp.auth.pass);
//   }

//   validateAPIConfig(): boolean {
//     const api = this.config.api;
//     return !!(api.apiToken && api.accountId);
//   }

//   validateWebhookConfig(): boolean {
//     const webhook = this.config.webhook;
//     return !!(webhook.secret && webhook.endpoint);
//   }

//   validateEmailConfig(): boolean {
//     const email = this.config.email;
//     return !!(email.fromEmail && email.fromName);
//   }

//   // Helper method to get nodemailer configuration
//   getNodemailerConfig() {
//     const smtp = this.getSMTPConfig();
//     return {
//       host: smtp.host,
//       port: smtp.port,
//       secure: smtp.secure,
//       auth: {
//         user: smtp.auth.user,
//         pass: smtp.auth.pass,
//       },
//       tls: {
//         rejectUnauthorized: false, // For development/sandbox
//       },
//     };
//   }

//   // Helper method to get email defaults
//   getEmailDefaults() {
//     const email = this.getEmailConfig();
//     return {
//       from: `"${email.fromName}" <${email.fromEmail}>`,
//       replyTo: email.replyTo || email.fromEmail,
//     };
//   }

//   // Debug method to log configuration (without sensitive data)
//   logConfiguration(): void {
//     console.log('Mailtrap Configuration:', {
//       environment: this.config.environment,
//       smtp: {
//         host: this.config.smtp.host,
//         port: this.config.smtp.port,
//         secure: this.config.smtp.secure,
//         userConfigured: !!this.config.smtp.auth.user,
//       },
//       api: {
//         apiUrl: this.config.api.apiUrl,
//         tokenConfigured: !!this.config.api.apiToken,
//         accountConfigured: !!this.config.api.accountId,
//       },
//       webhook: {
//         endpoint: this.config.webhook.endpoint,
//         secretConfigured: !!this.config.webhook.secret,
//       },
//       email: {
//         fromEmail: this.config.email.fromEmail,
//         fromName: this.config.email.fromName,
//         replyTo: this.config.email.replyTo,
//       },
//       validation: {
//         smtp: this.validateSMTPConfig(),
//         api: this.validateAPIConfig(),
//         webhook: this.validateWebhookConfig(),
//         email: this.validateEmailConfig(),
//       },
//     });
//   }
// }