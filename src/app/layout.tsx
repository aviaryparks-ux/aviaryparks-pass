import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from "@/contexts/LanguageContext";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aviary Park - Annual Pass",
  description: "Daftar dan gunakan tiket tahunan Anda dengan pengenalan wajah.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${montserrat.variable}`}>
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
