import type { Metadata } from "next";
import ThemeRegistry from "@/theme/provider";
import { Providers } from "@/store/provider";

export const metadata: Metadata = {
  title: "Next Memo",
  description: "Next Memo Application",
};

export const generateViewport = () => ({
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: "no",
});

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
