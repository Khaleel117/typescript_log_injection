// import { PrismaAdapter } from '@auth/prisma-adapter';
import prisma from '@/lib/prisma';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
// import NextAuth, { getServerSession, type NextAuthOptions } from 'next-auth';
// import { Adapter } from 'next-auth/adapters';
import {
  GetServerSidePropsContext,
  NextApiRequest,
  NextApiResponse,
} from 'next';
import { type NextAuthOptions } from 'next-auth';
import NextAuth, { getServerSession } from 'next-auth/next';

export const config = {
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  callbacks: {
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.image = token.picture;
        session.user.username = token.username;
      }

      return session;
    },
    async jwt({ token, user }) {
      const prismaUser = await prisma.user.findFirst({
        where: {
          email: token.email,
        },
      });

      if (!prismaUser) {
        token.id = user.id;
        return token;
      }
      if (!prismaUser.username) {
        await prisma.user.update({
          where: {
            id: prismaUser.id,
          },
          data: {
            username: prismaUser.name?.split(' ').join('').toLowerCase(),
          },
        });
      }

      // const updatedToken = {
      //   id: prismaUser.id,
      //   name: prismaUser.name,
      //   email: prismaUser.email,
      //   username: prismaUser.username,
      //   picture: prismaUser.image,
      // };
      // console.log('JWT callback - after (existing user):', updatedToken);
      // return updatedToken;

      return {
        id: prismaUser.id,
        name: prismaUser.name,
        email: prismaUser.email,
        username: prismaUser.username,
        picture: prismaUser.image,
      };
    },
  },
  logger: {
    debug: (code, metadata) => {
      console.log(`[NEXTAUTH DEBUG]: ${code}`, metadata);
    },
    warn: (code) => {
      console.warn(`[NEXTAUTH WARN]: ${code}`);
    },
    error: (code, metadata) => {
      console.error(`[NEXTAUTH ERROR]: ${code}`, metadata);
    },
  },
  // };
} satisfies NextAuthOptions;

export default NextAuth(config);

// Use it in server contexts
export function auth(
  ...args:
    | [GetServerSidePropsContext['req'], GetServerSidePropsContext['res']]
    | [NextApiRequest, NextApiResponse]
    | []
) {
  console.log('+++Config:', config);
  return getServerSession(...args, config);
}
