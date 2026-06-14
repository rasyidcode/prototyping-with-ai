import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mundial Merge 2026 - FIFA World Cup 48-Team Physics Game",
  description: "A Suika-style merging puzzle game featuring all 48 qualified countries of the FIFA World Cup 2026! Drop teams, merge badges, unlock the Panini-style sticker album, and reach Argentina!",
  keywords: ["suika game", "watermelon game", "world cup 2026", "fifa 2026", "soccer game", "merge game", "physics puzzle", "phaser", "nextjs", "typescript"],
  openGraph: {
    title: "Mundial Merge 2026 - FIFA World Cup 48-Team Physics Game",
    description: "A Suika-style merging puzzle game featuring all 48 qualified countries of the FIFA World Cup 2026! Drop teams, merge badges, and unlock the sticker album!",
    type: "website",
    locale: "en_US",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
