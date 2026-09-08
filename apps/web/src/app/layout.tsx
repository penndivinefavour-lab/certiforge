import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "../styles/globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "CertiForge - Professional Certificate Generation",
  description: "Design templates, import recipients, and generate beautiful PDF certificates with verification QR codes. No account required.",
  metadataBase: new URL('https://certiforge.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'CertiForge',
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f1a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        {children}
      </body>
    </html>
  );
}
