// Sync interval in milliseconds (1 hour)
export const SYNC_INTERVAL_MS = 60 * 60 * 1000

// Featured asset identifiers shown to the user in the swap flow.
// Must match the token identifier format from the provider API.
// Full asset details are resolved from the database at runtime.
export const FEATURED_IDENTIFIERS: string[] = [
  'BTC.BTC',
  'ETH.ETH',
  'XMR.XMR',
  'BSC.BNB',
  'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
  'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
]
