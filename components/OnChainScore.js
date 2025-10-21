'use client'

import React, { useState, useEffect } from 'react'
import styles from './OnChainScore.module.css'
import { sdk } from '@farcaster/miniapp-sdk'

const ActivityIcon = () => (
  <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
    <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" />
  </svg>
)

const TrendingUpIcon = () => (
  <svg className={styles.iconLarge} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const WalletIcon = () => (
  <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
    <path d="M3 10h18V5H3v5zm0 8v-2h18v2H3z" />
  </svg>
)

const GiftIcon = () => (
  <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
  </svg>
)

const BridgeIcon = () => (
  <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z" />
  </svg>
)

const ZapIcon = () => (
  <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)

const CalendarIcon = () => (
  <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
  </svg>
)

export default function OnChainScore() {
  const [walletAddress, setWalletAddress] = useState('')
  const [scoreData, setScoreData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [userConnected, setUserConnected] = useState(false)

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        console.log('Initializing Farcaster SDK...')
        await sdk.actions.ready()
        console.log('Farcaster SDK ready() called successfully')
      } catch (error) {
        console.error('Error initializing Farcaster SDK:', error)
      }
    }
    
    initSDK()
  }, [])

  const calculateScore = (data) => {
    let score = 0
    
    score += Math.min(data.txnCount / 500, 3)
    score += Math.min(data.nftCount / 20, 2)
    score += Math.min(data.walletAgeMonths / 36, 2)
    score += Math.min(data.contractsInteracted / 50, 1.5)
    
    const volumeInEth = parseFloat(data.transactedVolumeNum) || 0
    score += Math.min(volumeInEth / 1000, 1.5)
    
    return Math.min(score, 10).toFixed(1)
  }

  const fetchOnChainData = async (address) => {
    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      setError('Please enter a valid Base EVM address (0x...)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
      
      if (!apiKey) {
        setError('API key not configured. Add NEXT_PUBLIC_ALCHEMY_API_KEY to environment.')
        setLoading(false)
        return
      }

      const baseUrl = 'https://base-mainnet.g.alchemy.com/v2/' + apiKey

      // Fetch outgoing transfers
      const outgoingResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [{
            fromAddress: address,
            category: ['external', 'erc20', 'erc721', 'erc1155'],
            maxCount: '0x3e8', // 1000 in hex
            withMetadata: true
          }],
          id: 1
        })
      })

      const outgoingData = await outgoingResponse.json()
      
      if (outgoingData.error) {
        setError('API Error: ' + outgoingData.error.message)
        setLoading(false)
        return
      }

      // Fetch incoming transfers
      const incomingResponse = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [{
            toAddress: address,
            category: ['external', 'erc20', 'erc721', 'erc1155'],
            maxCount: '0x3e8',
            withMetadata: true
          }],
          id: 2
        })
      })

      const incomingData = await incomingResponse.json()

      const outgoing = outgoingData.result?.transfers || []
      const incoming = incomingData.result?.transfers || []
      const allTransfers = [...outgoing, ...incoming]

      console.log('Total transfers:', allTransfers.length)

      // Calculate transaction count
      const txnCount = allTransfers.length

      // Count NFTs (ERC721 and ERC1155)
      const nftTransfers = allTransfers.filter(t => 
        t.category === 'erc721' || t.category === 'erc1155'
      )
      const nftCount = nftTransfers.length

      // Get unique contracts
      const uniqueContracts = new Set()
      allTransfers.forEach(t => {
        if (t.to && t.to !== address.toLowerCase()) uniqueContracts.add(t.to)
        if (t.from && t.from !== address.toLowerCase()) uniqueContracts.add(t.from)
        if (t.rawContract?.address) uniqueContracts.add(t.rawContract.address)
      })

      // Calculate total volume (only ETH transfers)
      let totalVolume = 0
      let bridgedVolume = 0
      
      // Popular bridge contracts on Base (lowercase)
      const bridgeContracts = [
        '0x49048044d57e1c92a77f79988d21fa8faf74e97e', // Base Bridge (legacy)
        '0x3154cf16ccdb4c6d922629664174b904d80f2c35', // Base Portal
        '0x866e82a600a1414e583f7f13623f1ac5d58b0afa', // Optimism Portal
        '0xc30141b657f4216252dc59af2e7cdb9d8792e1b0', // Socket Gateway
        '0x3666f603cc164936c1b87e207f36beba4ac5f18a', // Hop Protocol
        '0x3e4a3a4796d16c0cd582c382691998f7c06420b6', // Stargate Bridge
        '0x1116898dda4015ed8ddefb84b6e8bc24528af2d8', // Synapse Bridge
        '0x5427fefa711eff984124bfbb1ab6fbf5e3da1820', // Celer cBridge
        '0x4200000000000000000000000000000000000010', // Base L2 Standard Bridge
        '0x49048044d57e1c92a77f79988d21fa8faf74e97e'  // Base Bridge v2
      ].map(addr => addr.toLowerCase())
      
      allTransfers.forEach(t => {
        if (t.asset === 'ETH' && t.value) {
          const value = parseFloat(t.value) || 0
          totalVolume += value
          
          // Check if it's a bridge transaction
          const toAddress = t.to?.toLowerCase()
          const fromAddress = t.from?.toLowerCase()
          if (toAddress && bridgeContracts.includes(toAddress)) {
            bridgedVolume += value
          }
          if (fromAddress && bridgeContracts.includes(fromAddress)) {
            bridgedVolume += value
          }
        }
      })

      // Get wallet age from actual timestamps
      let walletAgeYears = '0.0'
      let walletAgeMonths = 0
      
      if (allTransfers.length > 0) {
        // Sort by block timestamp
        const sorted = [...allTransfers].filter(t => t.metadata?.blockTimestamp).sort((a, b) => {
          return new Date(a.metadata.blockTimestamp) - new Date(b.metadata.blockTimestamp)
        })
        
        if (sorted.length > 0) {
          const oldestTx = sorted[0]
          const txDate = new Date(oldestTx.metadata.blockTimestamp)
          const ageDays = Math.floor((Date.now() - txDate.getTime()) / (1000 * 60 * 60 * 24))
          walletAgeMonths = Math.floor(ageDays / 30)
          walletAgeYears = (walletAgeMonths / 12).toFixed(1)
        }
      }

      const data = {
        txnCount,
        nftCount,
        bridgedVolume: bridgedVolume.toFixed(2) + ' ETH',
        transactedVolume: totalVolume.toFixed(2) + ' ETH',
        transactedVolumeNum: totalVolume,
        contractsInteracted: uniqueContracts.size,
        walletAge: walletAgeYears + ' years',
        walletAgeMonths,
        address
      }

      data.onChainScore = calculateScore(data)
      console.log('Final data:', data)
      setScoreData(data)
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to fetch data: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConnectWallet = async () => {
    try {
      console.log('Requesting Farcaster context...')
      
      // Get Farcaster context which includes user info
      const context = await sdk.context
      
      if (context && context.user && context.user.verifications) {
        // Get the first verified address
        const verifiedAddress = context.user.verifications[0]
        
        if (verifiedAddress) {
          console.log('Wallet found:', verifiedAddress)
          setUserConnected(true)
          setWalletAddress(verifiedAddress)
          await fetchOnChainData(verifiedAddress)
        } else {
          setError('No verified wallet found on your Farcaster account')
        }
      } else {
        setError('Could not get Farcaster user context')
      }
    } catch (err) {
      console.error('Wallet connection error:', err)
      setError('Could not connect wallet. Please enter your address manually.')
    }
  }

  const handleSearch = () => {
    fetchOnChainData(walletAddress)
  }

  return (
    <div className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <span className={styles.headerIcon}>
              <TrendingUpIcon />
            </span>
            <h1 className={styles.title}>On-Chain Score</h1>
          </div>
          <p className={styles.subtitle}>View your wallet's on-chain metrics and activity score on Base</p>
        </div>

        <div className={styles.inputSection}>
          <div className={styles.inputContent}>
            <button onClick={handleConnectWallet} className={styles.connectBtn}>
              <WalletIcon />
              Connect Wallet
            </button>

            <div className={styles.divider}>Enter a wallet address:</div>
            <div className={styles.inputGroup}>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className={styles.input}
              />
              <button onClick={handleSearch} disabled={loading} className={styles.searchBtn}>
                {loading ? 'Loading...' : 'Search'}
              </button>
            </div>

            {userConnected && (
              <div className={styles.connected}>✓ Wallet connected</div>
            )}
          </div>

          {error && (
            <div className={styles.error}>{error}</div>
          )}
        </div>

        {scoreData && (
          <div className={styles.scoreCard}>
            <div className={styles.scoreHeader}>
              <div>
                <p className={styles.scoreLabel}>ON-CHAIN SCORE</p>
                <p className={styles.scoreValue}>{scoreData.onChainScore}</p>
              </div>
              <div className={styles.scoreIcon}>
                <TrendingUpIcon />
              </div>
            </div>

            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statIconCyan}>
                    <ActivityIcon />
                  </span>
                  <p className={styles.statLabel}>Transactions</p>
                </div>
                <p className={styles.statValue}>{scoreData.txnCount.toLocaleString()}</p>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statIconPink}>
                    <GiftIcon />
                  </span>
                  <p className={styles.statLabel}>NFTs Owned</p>
                </div>
                <p className={styles.statValue}>{scoreData.nftCount}</p>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statIconOrange}>
                    <BridgeIcon />
                  </span>
                  <p className={styles.statLabel}>Bridged Volume</p>
                </div>
                <p className={styles.statValue}>{scoreData.bridgedVolume}</p>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statIconYellow}>
                    <ZapIcon />
                  </span>
                  <p className={styles.statLabel}>Transacted Volume</p>
                </div>
                <p className={styles.statValue}>{scoreData.transactedVolume}</p>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statIconGreen}>
                    <ActivityIcon />
                  </span>
                  <p className={styles.statLabel}>Contracts Interacted</p>
                </div>
                <p className={styles.statValue}>{scoreData.contractsInteracted}</p>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statHeader}>
                  <span className={styles.statIconBlue}>
                    <CalendarIcon />
                  </span>
                  <p className={styles.statLabel}>Wallet Age</p>
                </div>
                <p className={styles.statValue}>{scoreData.walletAge}</p>
              </div>
            </div>

            <div className={styles.cardFooter}>
              <p className={styles.footerText}>Address: {scoreData.address}</p>
            </div>
          </div>
        )}

        {!scoreData && !loading && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              <WalletIcon />
            </span>
            <p>Enter a Base network wallet address to view on-chain metrics</p>
          </div>
        )}
      </div>
    </div>
  )
}