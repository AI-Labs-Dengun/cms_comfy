import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import EnvironmentCheck from "@/components/EnvironmentCheck";
import { AuthProvider } from "@/context/AuthContext";
import SessionDebug from "@/components/SessionDebug";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['monospace']
});

export const metadata: Metadata = {
  title: "Comfy CMS - Sistema de Administração",
  description: "Sistema de administração para o Comfy App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <EnvironmentCheck>
          <AuthProvider>
            {children}
            <SessionDebug show={process.env.NODE_ENV === 'development'} />
          </AuthProvider>
        </EnvironmentCheck>
      </body>
    </html>
  );
}
