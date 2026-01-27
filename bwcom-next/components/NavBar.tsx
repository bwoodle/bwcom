'use client';

import React from 'react';
import Link from 'next/link';
import { TopNavigation } from '@cloudscape-design/components';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const NavBar: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <TopNavigation
      identity={{
        href: '/',
        title: 'BWCom',
      }}
      utilities={[
        {
          type: 'button',
          text: 'Training Log',
          onClick: () => router.push('/training-log'),
        },
        {
          type: 'button',
          text: 'Race History',
          onClick: () => router.push('/race-history'),
        },
        {
          type: 'button',
          text: 'Reading List',
          onClick: () => router.push('/reading-list'),
        },
        {
          type: 'button',
          text: 'Resume',
          onClick: () => router.push('/resume'),
        },
        session ? {
          type: 'menu-dropdown',
          text: session.user?.name || 'User',
          items: [
            { id: 'signout', text: 'Sign Out', onClick: () => signOut() },
          ],
        } : {
          type: 'button',
          text: 'Login',
          onClick: () => signIn('google'),
        },
      ]}
    />
  );
};

export default NavBar;