import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const ADMIN_EMAILS = ['bwoodle@gmail.com', 'nhughes137@gmail.com'];

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token }) {
      if (token.email && ADMIN_EMAILS.includes(token.email)) {
        token.role = 'admin';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in, redirect admin users to /admin
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/admin`;
      }
      // Allow relative callback URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
});

export { handler as GET, handler as POST };