import type { Metadata, Viewport } from "next";
import ThemeRegistry from "@/theme/provider";
import { Providers } from "@/store/provider";

export const metadata: Metadata = {
  title: "Next Memo",
  description: "Next Memo Application",
};

export const generateViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <Providers>
          <ThemeRegistry>{children}</ThemeRegistry>
        </Providers>
      </body>
    </html>
  );
}
