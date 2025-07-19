// app/layout.tsx

import { Inter, Roboto_Mono } from 'next/font/google'
import Nav from '../components/Nav'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const robotoMono = Roboto_Mono({ subsets: ['latin'], variable: '--font-roboto-mono' })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased`}
        suppressHydrationWarning // Add this prop
      >
        <Nav />
        <main className="max-w-3xl mx-auto p-4">{children}</main>
      </body>
    </html>
  )
}