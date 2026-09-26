import { Prisma, type OAuthProvider, type User } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { badRequest, forbidden, unauthorized } from "../lib/errors.js";
import type { VerifiedIdentity } from "../lib/oauth.js";
import { sendSignInMethodAdded } from "./emails.js";

const isStaff = (user: Pick<User, "role">) => user.role === "admin" || user.role === "super_admin";
const FALLBACK_NAME = "DialNFind user";

/** Provider names can hold digits, emoji and the like; keep what our own name rule allows. */
export function cleanName(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? "")
    .replace(/[^\p{L}\p{M} .'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[^\p{L}]+/u, "")
    .slice(0, 80)
    .trim();
  return cleaned.length >= 2 ? cleaned : null;
}

interface SocialSignIn {
  provider: OAuthProvider;
  identity: VerifiedIdentity;
  /** Only used when a new account is created. */
  role: "customer" | "provider";
  /** Name the app collected (Apple sends it to the app once, on the very first sign-in). */
  name?: string | null;
}

function checkUsable(user: User) {
  if (isStaff(user)) throw forbidden("Staff accounts sign in with email and password");
  if (user.status !== "active") throw unauthorized("This account is not active");
}

/**
 * Finds the account for a verified Google/Apple identity: an identity seen before signs in to its
 * account, a new identity whose verified email matches an account is linked to it, and otherwise a new
 * account is created (no password; the provider has confirmed the email).
 */
export async function signInWithIdentity(input: SocialSignIn, attempt = 0): Promise<{ user: User; isNewUser: boolean }> {
  const { provider, identity } = input;
  const now = new Date();

  const linked = await prisma.userOAuthAccount.findUnique({
    where: { provider_providerUserId: { provider, providerUserId: identity.sub } },
    include: { user: true },
  });
  if (linked) {
    checkUsable(linked.user);
    await prisma.userOAuthAccount.update({
      where: { id: linked.id },
      data: { lastUsedAt: now, email: identity.email ?? linked.email, clientId: identity.audience || linked.clientId },
    });
    const user = await prisma.user.update({ where: { id: linked.userId }, data: { lastLoginAt: now } });
    return { user, isNewUser: false };
  }

  if (!identity.email) {
    // Apple only shares the email the first time someone signs in to an app. If we have no record of
    // that sign-in (for example the account was deleted), Apple has to be told to forget us first.
    throw badRequest(
      provider === "apple"
        ? "Apple did not share your email. Open Settings › Apple ID › Sign in with Apple, remove DialNFind, then try again."
        : "Your Google account did not share an email address.",
    );
  }
  if (!identity.emailVerified) throw badRequest("Please verify your email address with your provider first, then try again.");

  try {
    const existing = await prisma.user.findUnique({ where: { email: identity.email } });
    if (existing) {
      checkUsable(existing);
      const [, user] = await prisma.$transaction([
        prisma.userOAuthAccount.create({
          data: { userId: existing.id, provider, providerUserId: identity.sub, email: identity.email, clientId: identity.audience || null },
        }),
        prisma.user.update({
          where: { id: existing.id },
          data: { lastLoginAt: now, emailVerifiedAt: existing.emailVerifiedAt ?? now },
        }),
      ]);
      void sendSignInMethodAdded(user, provider);
      return { user, isNewUser: false };
    }

    const user = await prisma.user.create({
      data: {
        role: input.role,
        name: cleanName(input.name) ?? cleanName(identity.name) ?? FALLBACK_NAME,
        email: identity.email,
        passwordHash: null,
        emailVerifiedAt: now,
        termsAcceptedAt: now,
        lastLoginAt: now,
        profilePhotoUrl: identity.picture,
        oauthAccounts: {
          create: { provider, providerUserId: identity.sub, email: identity.email, clientId: identity.audience || null },
        },
      },
    });
    return { user, isNewUser: true };
  } catch (err) {
    // Two first sign-ins at the same moment: the other request created the row, so try once more and find it.
    if (attempt === 0 && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return signInWithIdentity(input, 1);
    }
    throw err;
  }
}

/** Saves the Apple refresh token (used only to revoke access on deletion) the first time we receive one. */
export async function storeAppleRefreshToken(sub: string, refreshToken: string, clientId: string) {
  await prisma.userOAuthAccount.updateMany({
    where: { provider: "apple", providerUserId: sub },
    data: { refreshToken, clientId },
  });
}
