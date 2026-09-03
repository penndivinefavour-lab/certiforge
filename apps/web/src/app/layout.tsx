import "./globals.css";

export const metadata = {
  title: "CertiForge - Digital Certificate Generation Platform",
  description: "Create, personalize, issue, and verify professional certificates at scale.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
