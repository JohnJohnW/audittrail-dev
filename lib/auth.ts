import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import { db } from "./db";
import { logger } from "./logger";
import { encrypt } from "./encryption";

// Validate required environment variables at startup
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  if (process.env.SKIP_ENV_VALIDATION !== "true") {
    throw new Error(
      "GitHub OAuth credentials are required. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables."
    );
  }
}

if (!process.env.NEXTAUTH_SECRET) {
  logger.warn("NEXTAUTH_SECRET is not set - authentication may not work correctly");
}

// Validate NEXTAUTH_URL - critical for OAuth to work
if (!process.env.NEXTAUTH_URL) {
  const errorMsg =
    "NEXTAUTH_URL is required for OAuth to work. " +
    "Set it to your production URL (e.g., https://audittrail-dev.vercel.app) in Vercel environment variables.";
  logger.error(errorMsg);
  // Don't throw in production to avoid breaking the app, but log the error
  if (process.env.NODE_ENV === "development") {
    throw new Error(errorMsg);
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
  },
  debug: process.env.NODE_ENV === "development",
  callbacks: {
    async jwt({ token, user, account }) {
      // On initial sign in, add user info and access token to JWT
      if (user) {
        token.id = user.id;

        // Fetch organization info once during sign-in
        try {
          const membership = await db.orgMembership.findFirst({
            where: { userId: user.id },
            include: { organization: true },
          });

          if (membership) {
            token.orgId = membership.organization.id;
            token.orgSlug = membership.organization.slug;
            token.orgRole = membership.role;

            // Also store GitHub token in GitHubConnection for API routes
            if (account?.provider === "github" && account.access_token) {
              await db.gitHubConnection.upsert({
                where: { orgId: membership.organization.id },
                update: {
                  accessToken: encrypt(account.access_token),
                  scope: account.scope || "read:user user:email repo",
                },
                create: {
                  orgId: membership.organization.id,
                  githubAccountId: 0, // Will be updated on first API call
                  githubAccountLogin: user.email?.split("@")[0] || "unknown",
                  githubAccountType: "User",
                  accessToken: encrypt(account.access_token),
                  scope: account.scope || "read:user user:email repo",
                },
              });
            }
          }
        } catch (error) {
          logger.error("Error fetching user organization", error);
        }
      } else if (token.id && !token.orgId) {
        // Token exists but orgId is absent - this happens with stale tokens issued
        // before orgId was persisted, or if the initial DB write failed. Re-hydrate
        // from the database so the dashboard doesn't incorrectly prompt reconnection.
        try {
          const membership = await db.orgMembership.findFirst({
            where: { userId: token.id as string },
            include: { organization: true },
          });
          if (membership) {
            token.orgId = membership.organization.id;
            token.orgSlug = membership.organization.slug;
            token.orgRole = membership.role;
          }
        } catch (error) {
          logger.error("Error re-hydrating org info in JWT", error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      // Transfer token data to session
      if (session.user && token) {
        session.user.id = token.id as string;
        session.orgId = token.orgId as string | undefined;
        session.orgSlug = token.orgSlug as string | undefined;
        session.orgRole = token.orgRole as string | undefined;
        // Check GitHub connection from database (token no longer stored in JWT)
        if (token.orgId) {
          const ghConn = await db.gitHubConnection.findUnique({
            where: { orgId: token.orgId as string },
            select: { id: true },
          });
          session.hasGitHubConnection = !!ghConn;
        } else {
          session.hasGitHubConnection = false;
        }
      }
      return session;
    },
    async signIn({ user }) {
      if (!user.email) return false;
      return true;
    },
  },
  events: {
    async createUser({ user }) {
      // Create a default organization for new users
      if (user.email && user.id) {
        try {
          const slug = user.email
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-");
          const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

          const org = await db.organization.create({
            data: {
              name: `${user.name || user.email.split("@")[0]}'s Organization`,
              slug: uniqueSlug,
            },
          });

          await db.orgMembership.create({
            data: {
              userId: user.id,
              orgId: org.id,
              role: "owner",
            },
          });

          // Create subscription with 14-day Pro trial
          await db.subscription.create({
            data: {
              orgId: org.id,
              status: "free",
              plan: "free",
              trialStartedAt: new Date(),
              trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
              trialUsed: true,
            },
          });
        } catch (error) {
          logger.error("Error creating user organization", error);
        }
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 14 * 24 * 60 * 60, // 14 days
  },
  trustHost: true,
});
