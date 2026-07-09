import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { getDb } from '@/lib/db';
import { User } from '@/entities/User';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'SIAT Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email dan password wajib diisi.');
        }

        const db = await getDb();
        const userRepo = db.getRepository<User>('User');

        const user = await userRepo.findOne({
          where: { email: credentials.email },
        });

        if (!user || !user.isActive) {
          throw new Error('Akun tidak ditemukan atau tidak aktif.');
        }

        const isPasswordValid = await compare(credentials.password, user.passwordHash);
        if (!isPasswordValid) {
          throw new Error('Password salah.');
        }

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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
