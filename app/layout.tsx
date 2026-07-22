import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aloudbeauty.vercel.app"),
  title: "Aloud, Beauty aloud",
  description:
    "A voice-first skincare assistant for blind and low-vision shoppers. Scan products, hear ingredients, and hear an honest read of your skin, with the screen off.",
  openGraph: {
    title: "Aloud, Beauty aloud",
    description:
      "The first beauty AI a blind shopper can use alone, with the screen off. Scan a product and hear what is in it, and hear an honest read of your skin.",
    url: "https://aloudbeauty.vercel.app",
    siteName: "Aloud",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Aloud, Beauty aloud",
    description:
      "The first beauty AI a blind shopper can use alone, with the screen off.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d0a08",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
