import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title: 'Problem Analyzer - Ishikawa & 5 Why',
  description: 'AI-powered root cause analysis with Ishikawa diagram and 5 Why methodology',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full min-h-screen">
      <body className="font-sans antialiased h-full min-h-screen flex flex-col">
        <AuthProvider>
          <div className="flex-1 flex flex-col min-h-screen">{children}</div>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
