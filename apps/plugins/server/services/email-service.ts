import nodemailer from 'nodemailer';
import { IEmailSource } from '@qelos/global-types';
import logger from './logger';

/**
 * Send an email using nodemailer
 * 
 * @param source Email integration source with SMTP configuration
 * @param authentication Authentication details (password)
 * @param to Recipient email address(es)
 * @param subject Email subject
 * @param body Email body content (HTML supported)
 * @param cc Optional CC recipients
 * @param bcc Optional BCC recipients
 * @returns Promise with sending result
 */
export async function sendEmail(
  source: IEmailSource,
  authentication: { password: string },
  to: string,
  subject: string,
  body: string,
  cc?: string,
  bcc?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Create transporter with source configuration
    const transporter = nodemailer.createTransport({
      host: source.metadata.smtp,
      port: 587, // Default to standard SMTP port
      secure: false, // Use TLS
      auth: {
        user: source.metadata.username || source.metadata.email,
        pass: authentication.password
      },
      tls: {
        rejectUnauthorized: false // For development environments
      }
    });

    // Set up email data
    const mailOptions = {
      from: {
        name: source.metadata.senderName || source.name,
        address: source.metadata.email
      },
      to: to,
      subject: subject,
      html: body, // Support HTML in email body
      cc: cc || undefined,
      bcc: bcc || undefined
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    logger.log(`Email sent: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (error) {
    logger.error('Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
