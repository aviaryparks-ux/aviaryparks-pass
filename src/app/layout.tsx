import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/contexts/LanguageContext";
import PwaRegister from "@/components/PwaRegister";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Aviary Park - Annual Pass",
  description: "Daftar dan gunakan tiket tahunan Anda dengan pengenalan wajah.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aviary Pass",
  },
  icons: {
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${montserrat.variable}`}>
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Aviary Pass" />
      </head>
      <body>
        <LanguageProvider>
          <PwaRegister />
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
