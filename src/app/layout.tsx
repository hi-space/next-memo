import type { Metadata } from 'next';
import ThemeRegistry from '@/theme/provider';
import { Providers } from '@/store/provider';

export const metadata: Metadata = {
  title: 'Next Memo',
  description: 'Next Memo Application',
};

export const generateViewport = () => ({
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: 'no',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='ko'>
      <head>
        <link rel='manifest' href='/manifest.json' />
        <meta name='theme-color' content='#1976d2' />
        <link rel='apple-touch-icon' href='/icon/logo.png' />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
        />
      </head>
      <body>
        <Providers>
          <ThemeRegistry>{children}</ThemeRegistry>
        </Providers>
      </body>
    </html>
  );
}
