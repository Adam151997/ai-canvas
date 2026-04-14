import { PrismaAdapter } from "@auth/prisma-adapter";
import { NextAuthConfig } from "next-auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

export const authConfig = {
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    signUp: "/sign-up",
    error: "/error",
    verifyRequest: "/verify-request",
    newUser: "/onboarding",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
        
        // Fetch user from database to get latest data
        const dbUser = await db.user.findUnique({
          where: { id: token.sub },
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            emailVerified: true,
          },
        });
        
        if (dbUser) {
          session.user = {
            ...session.user,
            ...dbUser,
          };
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.email = user.email;
        token.name = user.name;
        token.avatarUrl = user.avatarUrl;
      }
      return token;
    },
  },
  events: {
    async createUser({ user }) {
      // Send verification email when user signs up
      if (user.email) {
        await sendVerificationEmail(user.email);
      }
    },
  },
} satisfies NextAuthConfig;