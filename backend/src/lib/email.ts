import nodemailer, { type Transporter } from 'nodemailer';
import { config } from './config.js';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const auth = config.email.user
      ? { user: config.email.user, pass: config.email.pass }
      : undefined;

    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth,
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporter;
}

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail(options: SendMailOptions): Promise<boolean> {
  if (!config.email.enabled) {
    console.log(`[Email disabled] Would send to: ${options.to}, subject: ${options.subject}`);
    return true;
  }

  try {
    const client = getTransporter();
    await client.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    console.log(`[Email sent] To: ${options.to}, subject: "${options.subject}"`);
    return true;
  } catch (err: any) {
    console.error(`[Email error] Failed to send email to ${options.to}:`, err.message);
    return false;
  }
}

// Szablon zaproszenia do projektu
export async function sendProjectInvitationEmail(params: {
  to: string;
  recipientName: string;
  projectName: string;
  inviterName: string;
}): Promise<boolean> {
  const { to, recipientName, projectName, inviterName } = params;
  const subject = `Zaproszenie do projektu "${projectName}"`;
  const text = `Cześć ${recipientName},\n\n${inviterName} dodał(a) Cię do projektu "${projectName}".\nZaloguj się, aby zobaczyć zadania: ${config.email.appUrl}\n\nPozdrawiamy,\nZespół Task Manager`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #1a73e8; margin-top: 0;">Nowy projekt w Task Managerze</h2>
      <p style="font-size: 16px; color: #333;">Cześć <strong>${recipientName}</strong>,</p>
      <p style="font-size: 15px; color: #555; line-height: 1.5;">
        <strong>${inviterName}</strong> dodał(a) Cię jako członka do projektu:
      </p>
      <div style="background: #f8f9fa; border-left: 4px solid #1a73e8; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
        <span style="font-size: 18px; font-weight: 600; color: #202124;">📁 ${projectName}</span>
      </div>
      <p style="font-size: 15px; color: #555;">
        Możesz teraz przeglądać zadania tego projektu, dodawać nowe oraz współpracować z zespołem.
      </p>
      <div style="margin-top: 24px; text-align: center;">
        <a href="${config.email.appUrl}" style="background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 15px; display: inline-block;">
          Przejdź do aplikacji
        </a>
      </div>
      <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888; text-align: center; margin-bottom: 0;">
        Wiadomość wygenerowana automatycznie przez system Task Manager.
      </p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

// Szablon przypisania zadania
export async function sendTaskAssignedEmail(params: {
  to: string;
  recipientName: string;
  taskTitle: string;
  projectName: string;
  assignerName: string;
  priority?: string;
  dueDate?: string | null;
}): Promise<boolean> {
  const { to, recipientName, taskTitle, projectName, assignerName, priority = 'MEDIUM', dueDate } = params;
  const subject = `Przypisano Ci zadanie: "${taskTitle}"`;

  const priorityLabel = priority === 'HIGH' ? 'Wysoki' : priority === 'LOW' ? 'Niski' : 'Średni';
  const dueDateText = dueDate ? new Date(dueDate).toLocaleDateString('pl-PL') : 'Brak terminu';

  const text = `Cześć ${recipientName},\n\n${assignerName} przypisał(a) do Ciebie zadanie: "${taskTitle}" w projekcie "${projectName}".\nPriorytet: ${priorityLabel}\nTermin: ${dueDateText}\n\nSprawdź szczegóły: ${config.email.appUrl}\n\nPozdrawiamy,\nZespół Task Manager`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #1a73e8; margin-top: 0;">Nowe przypisane zadanie</h2>
      <p style="font-size: 16px; color: #333;">Cześć <strong>${recipientName}</strong>,</p>
      <p style="font-size: 15px; color: #555; line-height: 1.5;">
        <strong>${assignerName}</strong> przypisał(a) do Ciebie nowe zadanie:
      </p>
      <div style="background: #f8f9fa; border: 1px solid #e2e8f0; padding: 16px; margin: 16px 0; border-radius: 6px;">
        <div style="font-size: 17px; font-weight: 600; color: #1a73e8; margin-bottom: 8px;">
          ✓ ${taskTitle}
        </div>
        <div style="font-size: 14px; color: #555; margin-bottom: 4px;">
          <strong>Projekt:</strong> ${projectName}
        </div>
        <div style="font-size: 14px; color: #555; margin-bottom: 4px;">
          <strong>Priorytet:</strong> ${priorityLabel}
        </div>
        <div style="font-size: 14px; color: #555;">
          <strong>Termin wykonania:</strong> ${dueDateText}
        </div>
      </div>
      <div style="margin-top: 24px; text-align: center;">
        <a href="${config.email.appUrl}" style="background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 15px; display: inline-block;">
          Zobacz zadanie w aplikacji
        </a>
      </div>
      <hr style="margin-top: 32px; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888; text-align: center; margin-bottom: 0;">
        Wiadomość wygenerowana automatycznie przez system Task Manager.
      </p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

// Szablon resetowania hasła
export async function sendPasswordResetEmail(params: {
  to: string;
  recipientName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}): Promise<boolean> {
  const { to, recipientName, resetUrl, expiresInMinutes = 60 } = params;
  const subject = 'Resetowanie hasła w Task Manager';
  const text = `Cześć ${recipientName},\n\nOtrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w Task Managerze.\nAby ustawić nowe hasło, kliknij poniższy link (ważny przez ${expiresInMinutes} minut):\n${resetUrl}\n\nJeśli to nie Ty prosiłeś o reset hasła, zignoruj tę wiadomość.\n\nPozdrawiamy,\nZespół Task Manager`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #1a73e8; margin-top: 0;">Resetowanie hasła</h2>
      <p style="font-size: 16px; color: #333;">Cześć <strong>${recipientName}</strong>,</p>
      <p style="font-size: 15px; color: #555; line-height: 1.5;">
        Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta. Kliknij poniższy przycisk, aby zdefiniować nowe hasło:
      </p>
      <div style="margin: 28px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #1a73e8; color: #ffffff; text-decoration: none; padding: 13px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">
          Ustaw nowe hasło
        </a>
      </div>
      <p style="font-size: 13px; color: #666; line-height: 1.4;">
        Link jest ważny przez <strong>${expiresInMinutes} minut</strong>. Jeśli przycisk nie działa, skopiuj i wklej ten adres do przeglądarki:<br />
        <a href="${resetUrl}" style="color: #1a73e8; word-break: break-all;">${resetUrl}</a>
      </p>
      <hr style="margin-top: 28px; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888; text-align: center; margin-bottom: 0;">
        Jeśli nie prosiłeś o zmianę hasła, możesz bezpiecznie zignorować tę wiadomość — Twoje dotychczasowe hasło pozostaje bezpieczne.
      </p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}

// Szablon powiadomienia o nowym komentarzu
export async function sendTaskCommentEmail(params: {
  to: string;
  recipientName: string;
  commenterName: string;
  taskTitle: string;
  projectName: string;
  commentContent: string;
}): Promise<boolean> {
  const { to, recipientName, commenterName, taskTitle, projectName, commentContent } = params;
  const subject = `Nowy komentarz w zadaniu "${taskTitle}" (${projectName})`;
  const text = `Cześć ${recipientName},\n\n${commenterName} dodał(a) komentarz do zadania "${taskTitle}" w projekcie "${projectName}":\n\n"${commentContent}"\n\nAby odpowiedzieć lub zobaczyć zadanie, przejdź do aplikacji:\n${config.email.appUrl}\n\nPozdrawiamy,\nZespół Task Manager`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px; background: #ffffff;">
      <h2 style="color: #6366f1; margin-top: 0;">Nowy komentarz do zadania</h2>
      <p style="font-size: 15px; color: #333;">Cześć <strong>${recipientName}</strong>,</p>
      <p style="font-size: 14px; color: #555; line-height: 1.5;">
        <strong>${commenterName}</strong> skomentował(a) zadanie <strong>"${taskTitle}"</strong> w projekcie <em>${projectName}</em>:
      </p>
      <div style="background: #f1f5f9; border-left: 4px solid #6366f1; padding: 14px 16px; margin: 18px 0; border-radius: 4px; font-style: italic; color: #1e293b; font-size: 14px; white-space: pre-wrap;">
        ${commentContent}
      </div>
      <div style="margin-top: 24px; text-align: center;">
        <a href="${config.email.appUrl}" style="background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
          Otwórz zadanie w aplikacji
        </a>
      </div>
      <hr style="margin-top: 28px; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #888; text-align: center; margin-bottom: 0;">
        Wiadomość wygenerowana automatycznie przez system Task Manager.
      </p>
    </div>
  `;

  return sendEmail({ to, subject, text, html });
}
