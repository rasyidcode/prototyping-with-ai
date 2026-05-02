import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ExpenseProvider } from "@/context/ExpenseContext";
import { LanguageProvider } from "@/context/LanguageContext";
import NextAuthSessionProvider from "@/components/SessionProvider";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ExpenseTracker | Premium Finance Management",
  description: "Track your expenses with our modern, premium dark-themed expense tracker. Built for clarity and ease of use.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-50 selection:bg-brand-500/30">
        <NextAuthSessionProvider>
          <LanguageProvider>
            <ExpenseProvider>
              {children}
            </ExpenseProvider>
          </LanguageProvider>
        </NextAuthSessionProvider>
      </body>
    </html>
  );
}
