import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kapruka AI — Smart Shopping Assistant",
  description:
    "Your AI-powered shopping assistant for Kapruka. Search products, compare prices, and get personalised recommendations — all in a natural conversation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased h-screen overflow-hidden">{children}</body>
    </html>
  );
}
