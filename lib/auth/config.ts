import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import db, { users } from "@/lib/db/client";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password required");
        }

        // Find user by email
        const userList = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        const user = userList[0];

        if (!user || !user.password) {
          throw new Error("Invalid email or password");
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValidPassword) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy",
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ account, profile }) {
      // Handle Google OAuth sign in
      if (account?.provider === "google" && profile?.email) {
        try {
          // Check if user already exists
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, profile.email))
            .limit(1);

          if (existingUser.length === 0) {
            // Create new user for Google OAuth
            await db.insert(users).values({
              email: profile.email,
              name: profile.name || null,
              image: (profile as any).picture || null,
            });
          } else {
            // Update existing user's image if they don't have one
            const existingUserData = existingUser[0];
            if (!existingUserData.image && (profile as any).picture) {
              await db
                .update(users)
                .set({ image: (profile as any).picture })
                .where(eq(users.email, profile.email));
            }
          }

          return true;
        } catch (error) {
          console.error("Error in Google OAuth sign in:", error);
          return false;
        }
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        // Set default profile image if none exists
        if (!session.user.image) {
          session.user.image = '/images/default-profile.jpg';
        }
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // On initial sign in
      if (user) {
        token.sub = user.id;
        token.picture = user.image || '/images/default-profile.jpg';
      }

      // For Google OAuth, get user ID from database
      if (account?.provider === "google" && profile?.email) {
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, profile.email))
          .limit(1);

        if (dbUser.length > 0) {
          token.sub = dbUser[0].id;
          token.email = dbUser[0].email;
          token.name = dbUser[0].name;
          token.picture = dbUser[0].image || '/images/default-profile.jpg';
        }
      }

      return token;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
};
