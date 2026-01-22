import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import GitHub from "next-auth/providers/github";
import { db } from "./db";

// Validate required environment variables at startup
if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
  throw new Error(
    "GitHub OAuth credentials are required. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables."
  );
}

if (!process.env.NEXTAUTH_SECRET) {
  console.warn("Warning: NEXTAUTH_SECRET is not set. Authentication may not work correctly.");
}

// Validate NEXTAUTH_URL - critical for OAuth to work
if (!process.env.NEXTAUTH_URL) {
  const errorMsg = 
    "NEXTAUTH_URL is required for OAuth to work. " +
    "Set it to your production URL (e.g., https://audittrail-dev.vercel.app) in Vercel environment variables.";
  console.error(errorMsg);
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

        // Store GitHub access token in JWT for repo access
        if (account?.provider === "github" && account.access_token) {
          token.githubAccessToken = account.access_token;
        }

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
                  accessToken: account.access_token,
                  scope: account.scope || "read:user user:email repo",
                },
                create: {
                  orgId: membership.organization.id,
                  githubAccountId: 0, // Will be updated on first API call
                  githubAccountLogin: user.email?.split("@")[0] || "unknown",
                  githubAccountType: "User",
                  accessToken: account.access_token,
                  scope: account.scope || "read:user user:email repo",
                },
              });
            }
          }
        } catch (error) {
          console.error("Error fetching user organization:", error);
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
        // Include GitHub connection status
        session.hasGitHubConnection = !!token.githubAccessToken;
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

          // Create a free subscription
          await db.subscription.create({
            data: {
              orgId: org.id,
              status: "free",
              plan: "free",
            },
          });
        } catch (error) {
          console.error("Error creating user organization:", error);
        }
      }
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
});
