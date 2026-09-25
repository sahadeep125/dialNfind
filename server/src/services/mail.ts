import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../env.js";
import { prisma } from "../lib/prisma.js";

export interface MailMessage {
  to: string;
  subject: string;
  /** Short paragraphs, rendered as <p> in the HTML version. */
  lines: string[];
  action?: { label: string; url: string };
}

let transporter: Transporter | null = null;

function transport(): Transporter {
  transporter ??= nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function render({ subject, lines, action }: MailMessage) {
  const text = [...lines, ...(action ? [`${action.label}: ${action.url}`] : []), "", "DialNFind"].join("\n\n");
  const html = `<!doctype html><html><body style="margin:0;background:#f5f6fb;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2340">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<div style="font-weight:700;font-size:18px;color:#2a2f7a;margin-bottom:20px">DialNFind</div>
<div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #e6e8f2">
<h1 style="font-size:20px;margin:0 0 16px">${escape(subject)}</h1>
${lines.map((l) => `<p style="font-size:15px;line-height:1.55;margin:0 0 12px">${escape(l)}</p>`).join("\n")}
${action ? `<p style="margin:24px 0 8px"><a href="${escape(action.url)}" style="display:inline-block;background:#3d4bd6;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:10px">${escape(action.label)}</a></p><p style="font-size:12px;color:#6b7090;word-break:break-all;margin:12px 0 0">Or open this link: ${escape(action.url)}</p>` : ""}
</div>
<p style="font-size:12px;color:#6b7090;margin-top:16px">You received this email because you have an account on DialNFind.</p>
</div></body></html>`;
  return { text, html };
}

/**
 * Sends an email. Never throws: a failed email must not fail the request that triggered it.
 * Without SMTP_HOST (development) the message is printed to the console instead.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  const { text, html } = render(message);
  if (!env.smtp.host) {
    console.info(`\n[mail] to ${message.to}: ${message.subject}\n${text}\n`);
    return;
  }
  try {
    await transport().sendMail({ from: env.smtp.from, to: message.to, subject: message.subject, text, html });
  } catch (err) {
    console.error(`[mail] could not send "${message.subject}" to ${message.to}`, err);
  }
}

/** Emails an account holder, skipping deleted accounts. Used next to in-app notifications for important events. */
export async function mailUser(userId: bigint | null | undefined, message: Omit<MailMessage, "to">): Promise<void> {
  if (!userId) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, status: true } }).catch(() => null);
  if (!user || user.status === "deleted") return;
  await sendMail({ ...message, to: user.email });
}
