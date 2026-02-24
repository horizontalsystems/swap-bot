import { getAddress } from 'ethers'
import { bech32, bech32m } from 'bech32'
import bs58checkModule from 'bs58check'
import bs58Module from 'bs58'

const bs58check = bs58checkModule as unknown as { decode: (str: string) => Uint8Array }
const bs58 = bs58Module as unknown as { decode: (str: string) => Uint8Array }

// --- Validator functions ---

function validateEvm(address: string): boolean {
  try {
    getAddress(address)
    return true
  } catch {
    return false
  }
}

function validateBtc(address: string): boolean {
  // bech32 (bc1...)
  try {
    const decoded = bech32.decode(address)
    if (decoded.prefix === 'bc' && decoded.words.length > 0) return true
  } catch {}
  try {
    const decoded = bech32m.decode(address)
    if (decoded.prefix === 'bc' && decoded.words.length > 0) return true
  } catch {}
  // base58check (1... or 3...)
  try {
    const decoded = bs58check.decode(address)
    if (decoded.length === 21) {
      const version = decoded[0]
      if (version === 0x00 || version === 0x05) return true
    }
  } catch {}
  return false
}

function validateLtc(address: string): boolean {
  // bech32 (ltc1...)
  try {
    const decoded = bech32.decode(address)
    if (decoded.prefix === 'ltc' && decoded.words.length > 0) return true
  } catch {}
  // base58check (L, M, 3)
  try {
    const decoded = bs58check.decode(address)
    if (decoded.length === 21) {
      const version = decoded[0]
      if (version === 0x30 || version === 0x32 || version === 0x05) return true
    }
  } catch {}
  return false
}

function validateTron(address: string): boolean {
  if (!address.startsWith('T') || address.length !== 34) return false
  try {
    const decoded = bs58check.decode(address)
    return decoded.length === 21 && decoded[0] === 0x41
  } catch {
    return false
  }
}

function validateSol(address: string): boolean {
  try {
    const decoded = bs58.decode(address)
    return decoded.length === 32
  } catch {
    return false
  }
}

const MONERO_BASE58 = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/

function validateXmr(address: string): boolean {
  if (!address.startsWith('4') && !address.startsWith('8')) return false
  if (address.length !== 95 && address.length !== 106) return false
  return MONERO_BASE58.test(address)
}

function validateDoge(address: string): boolean {
  try {
    const decoded = bs58check.decode(address)
    if (decoded.length === 21) {
      const version = decoded[0]
      // 0x1E = D (P2PKH), 0x16 = 9/A (P2SH)
      if (version === 0x1e || version === 0x16) return true
    }
  } catch {}
  return false
}

function validateDash(address: string): boolean {
  try {
    const decoded = bs58check.decode(address)
    if (decoded.length === 21) {
      const version = decoded[0]
      // 0x4C = X (P2PKH), 0x10 = 7 (P2SH)
      if (version === 0x4c || version === 0x10) return true
    }
  } catch {}
  return false
}

function validateBch(address: string): boolean {
  // Legacy format (same as BTC base58check)
  try {
    const decoded = bs58check.decode(address)
    if (decoded.length === 21) {
      const version = decoded[0]
      if (version === 0x00 || version === 0x05) return true
    }
  } catch {}
  // CashAddr format: bitcoincash:q... or q... (without prefix)
  const cashAddrRegex = /^(bitcoincash:)?[qp][a-z0-9]{41}$/
  return cashAddrRegex.test(address.toLowerCase())
}

function validateZec(address: string): boolean {
  // Transparent t-addresses (base58check, 2-byte version: t1 = 0x1CB8, t3 = 0x1CBD)
  if (address.startsWith('t1') || address.startsWith('t3')) {
    try {
      const decoded = bs58check.decode(address)
      if (decoded.length === 22) return true
    } catch {}
  }
  // Unified addresses (bech32m u1...)
  try {
    const decoded = bech32m.decode(address, 512)
    if (decoded.prefix === 'u' && decoded.words.length > 0) return true
  } catch {}
  return false
}

function validateXec(address: string): boolean {
  // CashAddr format: ecash:q... or q...
  const cashAddrRegex = /^(ecash:)?[qp][a-z0-9]{41}$/
  if (cashAddrRegex.test(address.toLowerCase())) return true
  // Legacy (same as BTC)
  try {
    const decoded = bs58check.decode(address)
    if (decoded.length === 21) {
      const version = decoded[0]
      if (version === 0x00 || version === 0x05) return true
    }
  } catch {}
  return false
}

function validateXrp(address: string): boolean {
  // Classic address (base58check, starts with r)
  if (address.startsWith('r') && address.length >= 25 && address.length <= 35) {
    try {
      bs58check.decode(address)
      return true
    } catch {}
  }
  // X-address format
  return address.startsWith('X') && address.length >= 46 && address.length <= 48
}

function validateXlm(address: string): boolean {
  // Stellar public key: starts with G, 56 chars, base32
  return /^G[A-Z2-7]{55}$/.test(address)
}

function validateCosmos(prefix: string): (address: string) => boolean {
  return (address: string): boolean => {
    try {
      const decoded = bech32.decode(address)
      return decoded.prefix === prefix && decoded.words.length > 0
    } catch {
      return false
    }
  }
}

function validateAda(address: string): boolean {
  // Shelley-era bech32 addresses: addr1...
  try {
    const decoded = bech32.decode(address, 200)
    if (decoded.prefix === 'addr' && decoded.words.length > 0) return true
  } catch {}
  return false
}

function validateDot(address: string): boolean {
  // SS58 format: base58check, typically starts with 1 for Polkadot, 33-35 chars
  try {
    const decoded = bs58check.decode(address)
    if (decoded.length === 35 || decoded.length === 3) return true
  } catch {}
  // Fallback: Polkadot addresses start with 1 and are ~47-48 chars
  return /^1[a-zA-Z0-9]{45,47}$/.test(address)
}

function validateTon(address: string): boolean {
  // User-friendly: EQ/UQ + 46 base64url chars
  // Raw: 0:64 hex chars
  return /^[EU]Q[A-Za-z0-9_-]{46}$/.test(address) || /^0:[a-fA-F0-9]{64}$/.test(address)
}

function validateNear(address: string): boolean {
  // Named account: 2-64 chars, lowercase + digits + hyphens + underscores + dots
  // Implicit account: 64 hex chars
  return /^[a-z0-9][a-z0-9._-]{0,62}[a-z0-9]$/.test(address) || /^[a-f0-9]{64}$/.test(address)
}

function validateSui(address: string): boolean {
  // 0x + 64 hex chars (32 bytes)
  return /^0x[a-fA-F0-9]{64}$/.test(address)
}

function validateXrd(address: string): boolean {
  // Radix bech32m: account_rdx1..., resource_rdx1..., etc.
  try {
    const decoded = bech32m.decode(address, 256)
    if (decoded.prefix.endsWith('_rdx') && decoded.words.length > 0) return true
  } catch {}
  return false
}

// --- Chain → validator mapping ---

const EVM_CHAINS = new Set(['ETH', 'BSC', 'ARB', 'AVAX', 'BASE', 'BERA', 'GNO', 'OP', 'POL'])

const validators: Record<string, (address: string) => boolean> = {
  BTC: validateBtc,
  LTC: validateLtc,
  TRON: validateTron,
  SOL: validateSol,
  XMR: validateXmr,
  DOGE: validateDoge,
  DASH: validateDash,
  BCH: validateBch,
  ZEC: validateZec,
  XEC: validateXec,
  XRP: validateXrp,
  XLM: validateXlm,
  ADA: validateAda,
  DOT: validateDot,
  TON: validateTon,
  NEAR: validateNear,
  SUI: validateSui,
  XRD: validateXrd,
  GAIA: validateCosmos('cosmos'),
  KUJI: validateCosmos('kujira'),
  MAYA: validateCosmos('maya'),
  THOR: validateCosmos('thor')
}

const HINTS: Record<string, string> = {
  BTC: 'must start with 1, 3, or bc1',
  ETH: 'must start with 0x and be 42 characters',
  BSC: 'must start with 0x and be 42 characters',
  ARB: 'must start with 0x and be 42 characters',
  AVAX: 'must start with 0x and be 42 characters',
  BASE: 'must start with 0x and be 42 characters',
  BERA: 'must start with 0x and be 42 characters',
  GNO: 'must start with 0x and be 42 characters',
  OP: 'must start with 0x and be 42 characters',
  POL: 'must start with 0x and be 42 characters',
  TRON: 'must start with T and be 34 characters',
  SOL: 'must be a valid Solana address',
  LTC: 'must start with L, M, 3, or ltc1',
  XMR: 'must start with 4 or 8 and be 95 characters',
  DOGE: 'must start with D or 9',
  DASH: 'must start with X or 7',
  BCH: 'must be a valid Bitcoin Cash address',
  ZEC: 'must start with t1, t3, or u1',
  XEC: 'must be a valid eCash address',
  XRP: 'must start with r or X',
  XLM: 'must start with G and be 56 characters',
  ADA: 'must start with addr1',
  DOT: 'must be a valid Polkadot SS58 address',
  TON: 'must start with EQ/UQ or be in raw format (0:...)',
  NEAR: 'must be a NEAR account name or 64-character hex',
  SUI: 'must start with 0x and be 66 characters',
  XRD: 'must be a valid Radix address',
  GAIA: 'must start with cosmos1',
  KUJI: 'must start with kujira1',
  MAYA: 'must start with maya1',
  THOR: 'must start with thor1'
}

export function validateAddress(identifier: string, address: string): string | null {
  const chain = identifier.split('.')[0]

  let valid: boolean

  if (EVM_CHAINS.has(chain)) {
    valid = validateEvm(address)
  } else if (validators[chain]) {
    valid = validators[chain](address)
  } else {
    // Unknown chain — accept anything reasonable
    valid = address.length >= 10
  }

  if (valid) return null
  return HINTS[chain] ?? 'Invalid address'
}
