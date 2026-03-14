export type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SendEmailResult = {
  delivered: boolean;
};

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
}

/**
 * Minimal email sender.
 *
 * - In dev (or when SMTP isn't configured), logs the email payload so developers
 *   can still access temporary passwords and links.
 * - In prod, configure SMTP_* env vars and install `nodemailer`.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  console.log('[email] sendEmail called with to:', input.to);
  if (!hasSmtpConfig()) {
    console.warn('[email] SMTP not configured; printing email to logs.');
    console.info('[email] To:', input.to);
    console.info('[email] Subject:', input.subject);
    console.info('[email] Text:', input.text);
    return { delivered: false };
  }

  let nodemailer: any;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    nodemailer = require('nodemailer');
  } catch (err) {
    console.warn('[email] nodemailer not installed; printing email to logs.');
    console.info('[email] To:', input.to);
    console.info('[email] Subject:', input.subject);
    console.info('[email] Text:', input.text);
    return { delivered: false };
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });

  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    console.log('[Email] Email sent successfully to', input.to);
    return { delivered: true };
  } catch (err) {
    console.error('[Email] Failed to send email:', err);
    console.info('[Email] To:', input.to);
    console.info('[Email] Subject:', input.subject);
    console.info('[Email] Text:', input.text);
    return { delivered: false };
  }
}

