import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenClaw Comics",
  description: "AI-generated comics platform powered by OpenClaw",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-950 text-white min-h-screen`}
      >
        {/* Navigation */}
        <nav className="border-b border-gray-800 bg-gray-950/95 backdrop-blur sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">🐾</span>
              <span className="font-bold text-xl text-white group-hover:text-orange-400 transition-colors">
                OpenClaw Comics
              </span>
            </Link>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/comics" className="hover:text-white transition-colors">All Comics</Link>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="min-h-screen">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-800 bg-gray-950 mt-16 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>© 2026 OpenClaw Comics · AI-Generated Content Platform</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
