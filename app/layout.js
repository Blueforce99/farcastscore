import './globals.css'

export const metadata = {
  title: 'On-Chain Score | Farcaster Mini App',
  description: 'View your wallet\'s on-chain metrics and activity score on Base',
  metadataBase: new URL('https://farcastscore.vercel.app'),
  openGraph: {
    title: 'On-Chain Score',
    description: 'View your wallet\'s on-chain metrics and activity score on Base',
    images: ['/og-image.png'],
    type: 'website',
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://farcastscore.vercel.app/og-image.png',
    'fc:frame:button:1': 'Check Your Score',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://farcastscore.vercel.app',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="fc:frame" content="vNext" />
        <meta name="fc:frame:image" content="https://farcastscore.vercel.app/og-image.png" />
        <meta name="fc:frame:button:1" content="Check Your Score" />
        <meta name="fc:frame:button:1:action" content="link" />
        <meta name="fc:frame:button:1:target" content="https://farcastscore.vercel.app" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}