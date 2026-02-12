'use client';

import React from 'react';
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
        title: 'Brent Woodle',
      }}
      utilities={[
        {
          type: 'button',
          text: 'About Me',
          onClick: () => router.push('/'),
        },
        // {
        //   type: 'button',
        //   text: 'Training Log',
        //   onClick: () => router.push('/training-log'),
        // },
        // {
        //   type: 'button',
        //   text: 'Race History',
        //   onClick: () => router.push('/race-history'),
        // },
        // {
        //   type: 'button',
        //   text: 'Media',
        //   onClick: () => router.push('/media'),
        // },
        ...(session?.user?.role === 'admin'
          ? [
              {
                type: 'button' as const,
                text: 'Admin',
                onClick: () => router.push('/admin'),
              },
            ]
          : []),
        session ? {
          type: 'menu-dropdown',
          text: session.user?.name || 'User',
          items: [
            { id: 'signout', text: 'Sign Out' },
          ],
          onItemClick: ({ detail }) => {
            if (detail.id === 'signout') {
              signOut();
            }
          },
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