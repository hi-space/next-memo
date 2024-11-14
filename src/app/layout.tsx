import type { Metadata } from 'next';
import ThemeRegistry from '@/theme/provider';
import { Providers } from '@/store/provider';

export const metadata: Metadata = {
  title: 'Next Memo',
  description: 'Next Memo Application',
  viewport: {
    width: "device-width",
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
    <html lang='ko'>
      <head>
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
