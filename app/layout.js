import './globals.css'
import Script from 'next/script'

export const metadata = {
  title: 'On-Chain Score | Farcaster Mini App',
  description: 'View your wallet\'s on-chain metrics and activity score',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <Script 
          src="https://farcaster.xyz/lib/farcaster.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}