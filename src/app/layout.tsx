import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PROPOS — Plataforma para Profesionales Inmobiliarios",
  description: "SaaS multi-tenant para agentes inmobiliarios en Trinidad y el Caribe. Dashboard personal, analitica de visitantes, portal white-label y control de impuestos.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1B4332",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased bg-background text-foreground`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
        {children}
      </body>
    </html>
  );
}