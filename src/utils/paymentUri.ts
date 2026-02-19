const EVM_CHAIN_IDS: Record<string, number> = {
  ETH: 1,
  BSC: 56,
  ARB: 42161,
  AVAX: 43114,
  BASE: 8453,
  OP: 10,
  POL: 137,
  GNO: 100,
  BERA: 80094
}

const BIP21_SCHEMES: Record<string, string> = {
  BTC: 'bitcoin',
  LTC: 'litecoin',
  DOGE: 'dogecoin',
  DASH: 'dash',
  BCH: 'bitcoincash',
  ZEC: 'zcash'
}

export function buildPaymentUri(
  chain: string,
  address: string,
  amount: number,
  contractAddress: string | null
): string | null {
  // Token transfers (ERC-20, TRC-20, SPL, etc.) — not reliably supported
  if (contractAddress) return null

  // BIP-21 style: bitcoin:addr?amount=X
  const bip21Scheme = BIP21_SCHEMES[chain]
  if (bip21Scheme) {
    return `${bip21Scheme}:${address}?amount=${amount}`
  }

  // EVM native: ethereum:addr@chainId?value=weiString
  const chainId = EVM_CHAIN_IDS[chain]
  if (chainId !== undefined) {
    const wei = BigInt(Math.round(amount * 1e9)) * BigInt(1e9)
    return `ethereum:${address}@${chainId}?value=${wei.toString()}`
  }

  // Monero
  if (chain === 'XMR') {
    return `monero:${address}?tx_amount=${amount}`
  }

  // Solana
  if (chain === 'SOL') {
    return `solana:${address}?amount=${amount}`
  }

  // TRON
  if (chain === 'TRON') {
    return `tron:${address}?amount=${amount}`
  }

  // XRP
  if (chain === 'XRP') {
    return `xrpl:${address}?amount=${amount}`
  }

  // Stellar
  if (chain === 'XLM') {
    return `web+stellar:pay?destination=${address}&amount=${amount}`
  }

  // TON — amount in nanotons
  if (chain === 'TON') {
    const nanotons = BigInt(Math.round(amount * 1e9))
    return `ton://transfer/${address}?amount=${nanotons.toString()}`
  }

  // Unsupported chain
  return null
}
