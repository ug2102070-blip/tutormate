import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/hooks/useAuth";
import { PwaRegister } from "@/components/PwaRegister";
import { NetworkStatus } from "@/components/NetworkStatus";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "TutorMate — Smart Tutor Management",
    template: "%s | TutorMate",
  },
  description:
    "Professional tutor management platform for private tutors and coaching centers in Bangladesh. Manage batches, attendance, fees, and student communication in one place.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TutorMate",
  },
  keywords: [
    "tutor management",
    "coaching center",
    "Bangladesh",
    "attendance",
    "fee collection",
    "student management",
  ],
  authors: [{ name: "TutorMate" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "TutorMate",
    title: "TutorMate — Smart Tutor Management",
    description:
      "Professional tutor management platform for private tutors and coaching centers.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col relative" suppressHydrationWarning>
        <AuthProvider>
          <NetworkStatus />
          <PwaRegister />
          <PwaInstallPrompt />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
