// Sync interval in milliseconds (1 hour)
export const SYNC_INTERVAL_MS = 60 * 60 * 1000

// Featured asset identifiers shown to the user in the swap flow.
// Must match the token identifier format from the provider API.
// Full asset details are resolved from the database at runtime.
// Allowed providers for quoting. Only these will be requested.
//
// The bot has no wallet: it can only tell a user where to send funds. So this list may
// only hold providers whose v2 `executionType` is `transfer` (the user makes a plain
// transfer to a deposit address) — plus THORCHAIN, whose `thorchain_deposit` needs a memo
// bound to the deposit and is served through the memoless flow instead. Anything that
// executes via `signed_transaction` or `stellar_broker` needs a signer and cannot be
// offered here; `GET /v2/providers` reports each provider's `executionType`.
export const ALLOWED_PROVIDERS: string[] = [
  'THORCHAIN',
  'NEAR',
  'LETSEXCHANGE',
  'QUICKEX',
  'STEALTHEX',
  'SWAPUZ',
  'EXOLIX',
  'CCE',
  'PEGASUS'
]

export const FEATURED_IDENTIFIERS: string[] = [
  'BTC.BTC',
  'ETH.ETH',
  'XMR.XMR',
  'TRON.TRX',
  'BSC.BNB',
  'SOL.SOL',
  'LTC.LTC',
  'ZEC.ZEC',
  'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
  'TRON.USDT-TR7NHQJEKQXGTCI8Q8ZY4PL8OTSZGJLJ6T',
  'SOL.USDT-ES9VMFRZACERMJFRF4H2FYD4KCONKY11MCCE8BENWNYB',
  'ETH.USDC-0XA0B86991C6218B36C1D19D4A2E9EB0CE3606EB48'
]
