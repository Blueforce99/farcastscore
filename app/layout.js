import './globals.css'

export const metadata = {
  title: 'On-Chain Score | Farcaster Mini App',
  description: 'View your wallet\'s on-chain metrics and activity score',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}