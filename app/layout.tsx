import type { Metadata } from "next";
import "./globals.css";

export const viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#0a0a0b" };

export const metadata: Metadata = {
  title: "掌櫃 ZHANGGUI — the shopkeeper who never forgets",
  description:
    "An AI front desk for restaurants. Everything it hears on the phone becomes memory that changes what happens on the floor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
