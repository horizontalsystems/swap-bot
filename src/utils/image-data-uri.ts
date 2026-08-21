/** Normalize provider QR output to an RFC 2397 image data URI accepted by signal-cli. */
export function normalizeImageDataUri(input: string): string {
  const value = input.trim()
  if (!value) throw new Error('Empty image data')

  if (/^data:/i.test(value)) {
    if (!/^data:image\/[a-z0-9.+-]+(?:;[^,]*)?;base64,[a-z0-9+/=\s]+$/i.test(value)) {
      throw new Error('Unsupported image data URI')
    }
    return value
  }

  const base64 = value.replace(/\s+/g, '')
  if (!/^[a-z0-9+/]+={0,2}$/i.test(base64)) throw new Error('Invalid base64 image data')
  return `data:image/png;base64,${base64}`
}
