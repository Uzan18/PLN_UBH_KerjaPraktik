import { withAuth } from 'next-auth/middleware';

/**
 * Next.js Middleware — Route Protection
 * 
 * Protects all dashboard pages by requiring authentication.
 * Unauthenticated users are automatically redirected to /login.
 * 
 * Using standard NextAuth withAuth ensures correct session token handling
 * and proper integration without breaking NextAuth internal endpoints.
 */
export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/laporan/:path*',
    '/informasi-asset/:path*',
    '/input/:path*',
    '/riwayat/:path*',
    '/validasi/:path*',
    '/master-data/:path*',
    '/log/:path*',
    '/unit/:path*',
  ],
};
