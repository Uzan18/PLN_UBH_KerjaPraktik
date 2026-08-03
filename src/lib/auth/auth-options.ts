import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { User } from '@/entities/User';
import { getRateLimitStatus, recordFailedAttempt, clearAttempts } from '@/lib/auth/rate-limit';
import { headers } from 'next/headers';

// Generic error message — same for all failure cases to prevent user enumeration (SEC-03)
const LOGIN_ERROR_GENERIC = 'Email atau password tidak valid.';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error(LOGIN_ERROR_GENERIC);
        }

        // [SEC-03] Rate limiting — extract IP from request headers
        const headersList = await headers();
        const ip =
          headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
          headersList.get('x-real-ip') ||
          'unknown';

        const { blocked, retryAfterSeconds } = getRateLimitStatus(ip);
        if (blocked) {
          throw new Error(
            `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(retryAfterSeconds / 60)} menit.`
          );
        }

        let db;
        try {
          db = await getDb();
        } catch {
          throw new Error('Layanan sementara tidak tersedia. Coba lagi nanti.');
        }

        const userRepo = db.getRepository(User);
        const user = await userRepo.findOne({
          where: { email: credentials.email },
        });

        // [SEC-03] Unified error for non-existent user, inactive user, and wrong password
        // This prevents user enumeration (knowing whether an email is registered)
        if (!user || !user.isActive) {
          recordFailedAttempt(ip);
          throw new Error(LOGIN_ERROR_GENERIC);
        }

        const isPasswordValid = await compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
          recordFailedAttempt(ip);
          throw new Error(LOGIN_ERROR_GENERIC);
        }

        // Successful login — clear any previous failed attempts for this IP
        clearAttempts(ip);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 hours
  },
  secret: process.env.NEXTAUTH_SECRET,
};
