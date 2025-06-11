import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import BackgroundImage from "@/components/BackgroundImage";
import { Toaster } from 'sonner'
import Providers from "./Providers";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Analytics } from "@vercel/analytics/react"
import "./globals.css";
import ThemeBody from "@/components/ThemeBody";

const bricolage_grotesque_init = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "kikoo.ai",
  description: "Refine your tweet with AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(message, source, lineno, colno, error) {
                if (message.includes('ChunkLoadError')) {
                  window.location.reload(true);
                }
              };
            `,
          }}
        />
      </head>
      <body className={`${bricolage_grotesque_init.className} antialiased h-screen`}>
        <ThemeBody>
          <Providers>
            <SidebarProvider>
              <AppSidebar />
              <Toaster />
              <BackgroundImage />
              <SidebarTrigger />
              {children}
              <Analytics />
            </SidebarProvider>
          </Providers>
        </ThemeBody>
      </body>
    </html>
  );
}
