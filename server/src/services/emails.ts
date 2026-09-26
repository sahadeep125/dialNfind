import type { UserRole } from "@prisma/client";
import { env } from "../env.js";
import { mailUser, sendMail } from "./mail.js";
import { issueUserToken, issueVerifyCode } from "./user-tokens.js";

/**
 * Every account, security, support and staff email in one place. Decisions about a business (listing,
 * claim, verification, plan) go through notifyAndEmail at their call sites. Frequent events such as
 * leads and reviews are in-app and push only, never email.
 */

interface Recipient {
  id: bigint;
  email: string;
  name: string;
  role: UserRole;
}

const firstName = (name: string) => name.split(" ")[0] || "there";
const appUrl = (role: UserRole) => (role === "provider" ? env.providerUrl : env.webUrl);
const when = (d = new Date()) =>
  d.toLocaleString("en-IN", { timeZone: env.timezone, dateStyle: "medium", timeStyle: "short" });
const longDate = (d: Date) => d.toLocaleDateString("en-IN", { timeZone: env.timezone, day: "numeric", month: "long", year: "numeric" });

/** Sign-up and "send a new code": a 6-digit code for the apps plus a link, both confirming the address. */
export async function sendVerificationEmail(user: Recipient) {
  const [code, token] = await Promise.all([issueVerifyCode(user.id), issueUserToken(user.id, "verify_email")]);
  await sendMail({
    to: user.email,
    subject: `${code} is your DialNFind code`,
    lines: [
      `Hi ${firstName(user.name)},`,
      "Enter this code in DialNFind to confirm your email address. It works for 30 minutes.",
    ],
    code,
    action: { label: "Or confirm with one tap", url: `${appUrl(user.role)}/verify-email?token=${token}` },
  });
}

/** Once, when a business owner's address is confirmed (or they first sign in with Google/Apple). */
export function sendProviderWelcome(user: Recipient) {
  if (user.role !== "provider") return Promise.resolve();
  return sendMail({
    to: user.email,
    subject: "Welcome to DialNFind for business",
    lines: [
      `Hi ${firstName(user.name)},`,
      "Your account is ready. Three steps get customers calling:",
      "1. Finish your listing: services, areas, hours and photos.",
      "2. Upload a business or ID document to earn the Verified badge, which ranks you higher.",
      "3. Install the DialNFind Business app to get an alert the moment a customer contacts you.",
    ],
    action: { label: "Open your dashboard", url: env.providerUrl },
  });
}

export function sendPasswordChanged(user: Recipient) {
  return sendMail({
    to: user.email,
    subject: "Your DialNFind password was changed",
    lines: [
      `Hi ${firstName(user.name)},`,
      `The password for your account was changed on ${when()}. Other devices were signed out.`,
      "If this was not you, reset your password now and contact support.",
    ],
    action: { label: "Reset password", url: `${env.webUrl}/forgot-password` },
  });
}

export function sendSignInMethodAdded(user: Recipient, provider: "google" | "apple") {
  const label = provider === "google" ? "Google" : "Apple";
  return sendMail({
    to: user.email,
    subject: `Sign in with ${label} was added to your account`,
    lines: [
      `Hi ${firstName(user.name)},`,
      `On ${when()} someone signed in to your DialNFind account with ${label} for the first time. You can now sign in either way.`,
      "If this was not you, contact support straight away.",
    ],
  });
}

/** Sent to the address before it is erased, so it must be called before anonymiseUser. */
export function sendAccountDeleted(user: Recipient, storeSubscription: "app_store" | "play_store" | null) {
  const store = storeSubscription === "app_store" ? "the App Store" : storeSubscription === "play_store" ? "Google Play" : null;
  return sendMail({
    to: user.email,
    subject: "Your DialNFind account was deleted",
    lines: [
      `Hi ${firstName(user.name)},`,
      "Your account and personal details have been removed, as you asked.",
      ...(user.role === "provider" ? ["Your business listing stays on DialNFind as an unclaimed listing, and its plan will not renew."] : []),
      ...(store ? [`Your subscription was bought through ${store}. Cancel it there so you are not charged again.`] : []),
      "If you did not ask for this, reply to this email.",
    ],
  });
}

export function sendAccountSuspended(userId: bigint) {
  return mailUser(userId, {
    subject: "Your DialNFind account has been suspended",
    lines: [
      "Your account was suspended by the DialNFind team and you have been signed out.",
      "If you think this is a mistake, reply to this email and tell us what happened.",
    ],
  });
}

export function sendPaymentFailed(userId: bigint | null | undefined, planName: string, graceUntil: Date | null) {
  return mailUser(userId, {
    subject: `Payment for your ${planName} plan failed`,
    lines: [
      "We could not take the renewal payment for your plan.",
      graceUntil
        ? `Your plan keeps working until ${longDate(graceUntil)} while we retry. Update your payment method before then to avoid losing it.`
        : "Update your payment method to keep your plan.",
    ],
    action: { label: "Update payment", url: `${env.providerUrl}/subscription` },
  });
}

/** Confirms a new support request, so guests from the contact form have the reference too. */
export function sendTicketReceived(to: string, name: string, reference: string, subject: string, signedIn: boolean) {
  return sendMail({
    to,
    subject: `We got your request [${reference}]`,
    lines: [
      `Hi ${firstName(name)},`,
      `Thanks for writing to DialNFind about "${subject}". Your reference is ${reference}.`,
      "Our team usually replies within one working day.",
      signedIn ? "You can follow the conversation under Help and support in your account." : "Reply to this email if you want to add anything.",
    ],
  });
}

/** A new team member sets their own password from this link; nobody else ever sees it. */
export async function sendStaffInvite(member: { id: bigint; email: string; name: string }, roleName: string, invitedBy: string) {
  const token = await issueUserToken(member.id, "reset_password", 48 * 60 * 60 * 1000);
  await sendMail({
    to: member.email,
    subject: "You have been added to the DialNFind team",
    lines: [
      `Hi ${firstName(member.name)},`,
      `${invitedBy} added you to the DialNFind admin team as ${roleName}.`,
      "Choose a password to sign in. The link works for 48 hours.",
    ],
    action: { label: "Set your password", url: `${env.webUrl}/reset-password?token=${token}` },
  });
}

export function sendStaffDigest(to: { email: string; name: string }, items: string[], adminUrl: string) {
  return sendMail({
    to: to.email,
    subject: "Today's DialNFind review queue",
    lines: [`Hi ${firstName(to.name)}, these are waiting for the team:`, ...items],
    action: { label: "Open the admin panel", url: adminUrl },
  });
}
