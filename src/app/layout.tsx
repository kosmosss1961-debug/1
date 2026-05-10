import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FatBurner - Умный помощник для похудения',
  description: 'AI-приложение для здорового образа жизни с прогнозированием веса и персонализированными рекомендациями',
  manifest: '/manifest.json',
  themeColor: '#00b894',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FatBurner',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
