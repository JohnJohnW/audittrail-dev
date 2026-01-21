import { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
    orgId?: string;
    orgSlug?: string;
    orgRole?: string;
    hasGitHubConnection?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    orgId?: string;
    orgSlug?: string;
    orgRole?: string;
    githubAccessToken?: string;
  }
}
