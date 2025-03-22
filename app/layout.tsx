import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata } from "next"

const inter = Inter({ subsets: ["latin"] })

// metadata for SEO
// should be same as manifest.ts
export const metadata: Metadata = {
  title: "Weather By JJTeoh",
  description: "A Weather Progressive Web App built with Next.js",
  manifest: "/manifest",
  // themeColor: "#3b82f6",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Weather",
  },
  // viewport: {
  //   width: "device-width",
  //   initialScale: 1,
  //   maximumScale: 1,
  // },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // openGraph: {
  //   type: "website",
  //   url: "https://weather-app.example.com", // TODO: change to your own domain
  //   title: "Weather By JJTeoh",
  //   description: "A Weather Progressive Web App built with Next.js",
  //   siteName: "Weather By JJTeoh",
  //   images: [{ url: "/icons/og-image.png" }], // TODO: change to your own image: https://tailwind-generator.com/og-image-generator/generator
  // },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}

          <footer className="text-center text-sm text-muted-foreground py-6">
            <p>Weather App by <a className="underline text-blue-500" href="https://github.com/jjteoh-thewebdev">JJTeoh</a></p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  )
}

