/// <reference types="vite/client" />
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router';
import * as React from 'react';
import appCss from '~/styles/app.css?url';
import { Header } from '~/components/Header';
import { Footer } from '~/components/Footer';
import { RouterDevtools } from '~/components/RouterDevtools';
import { NAV_ITEMS } from '~/data/nav';
import { BUSINESS } from '~/data/business';

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'stylesheet', href: appCss }],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'AWSome Painting & Decorating — Wellington' },
      {
        name: 'description',
        content:
          'Professional painting and decorating services in Wellington and the Upper Hutt region since 1993. Interior, exterior, and tiling.',
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <Header navItems={NAV_ITEMS} />
        <main className="flex-1">{children}</main>
        <Footer business={BUSINESS} />
        <RouterDevtools />
        <Scripts />
      </body>
    </html>
  );
}
