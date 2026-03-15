import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RaaS",
  description: "Retrieval-as-a-Service",
  icons: {
    icon: "/sk_icon.png",
    shortcut: "/sk_icon.png",
    apple: "/sk_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}
