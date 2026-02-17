import { getAddress } from 'ethers'
import { bech32 } from 'bech32'
import bs58checkModule from 'bs58check'
import bs58Module from 'bs58'

const bs58check = bs58checkModule as unknown as { decode: (str: string) => Uint8Array }
const bs58 = bs58Module as unknown as { decode: (str: string) => Uint8Array }

const HINTS: Record<string, string> = {
  BTC: 'Must start with 1, 3, or bc1',
  ETH: 'Must start with 0x and be 42 characters',
  BSC: 'Must start with 0x and be 42 characters',
  TRON: 'Must start with T and be 34 characters',
  SOL: 'Must be a valid Solana address',
  LTC: 'Must start with L, M, 3, or ltc1',
  XMR: 'Must start with 4 or 8 and be 95 characters'
}

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
      // 0x30 = L/M (pubkey hash), 0x32 = 3 (script hash), 0x05 = 3 (legacy script)
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

const XMR_BASE58 = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/

function validateXmr(address: string): boolean {
  if (!address.startsWith('4') && !address.startsWith('8')) return false
  if (address.length !== 95 && address.length !== 106) return false
  return XMR_BASE58.test(address)
}

export function validateAddress(identifier: string, address: string): string | null {
  const chain = identifier.split('.')[0]

  let valid: boolean

  switch (chain) {
    case 'ETH':
    case 'BSC':
      valid = validateEvm(address)
      break
    case 'BTC':
      valid = validateBtc(address)
      break
    case 'LTC':
      valid = validateLtc(address)
      break
    case 'TRON':
      valid = validateTron(address)
      break
    case 'SOL':
      valid = validateSol(address)
      break
    case 'XMR':
      valid = validateXmr(address)
      break
    default:
      valid = address.length >= 10
      break
  }

  if (valid) return null
  return HINTS[chain] ?? 'Invalid address'
}
