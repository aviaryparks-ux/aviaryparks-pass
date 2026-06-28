import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/contexts/LanguageContext";
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
  title: "Aviary Park - Annual Pass",
  description: "Daftar dan gunakan tiket tahunan Anda dengan pengenalan wajah.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <LanguageProvider>
          {children}
          <Toaster 
          position="top-center" 
          toastOptions={{
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
              padding: '16px',
            },
          }} 
        />
        </LanguageProvider>
      </body>
    </html>
  );
}
