import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/react"
import { FeatureFlagProvider } from "@/components/providers/FeatureFlagProvider"
import { createFlagsmithInstance } from "flagsmith/isomorphic"

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



export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const flagSmithId = process.env.NEXT_PUBLIC_FLAGSMITH_KEY

  const flagsmith = createFlagsmithInstance()
  await flagsmith.init({
    environmentID: flagSmithId,
    onChange: () => {
      console.log(`detected`)
    }
    // realtime: false, // we will poll manually due to free version has limited credit per month
    // Add optional identity, etc.
 });
 // poll every 10 seconds
//  flagsmith.startListening(1000); 
 const serverState = flagsmith.getState();
 console.log(serverState)

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <FeatureFlagProvider serverState={serverState}>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
       
            {children}
        
            <footer className="text-center text-sm text-muted-foreground py-6">
              <p>Weather App by <a className="underline text-blue-500" href="https://github.com/jjteoh-thewebdev">JJTeoh</a> with ❤️</p>
            </footer>
          </ThemeProvider>
        </FeatureFlagProvider>

        {/* Vercel analytics */}
        <Analytics />
      </body>
    </html>
  )
}

