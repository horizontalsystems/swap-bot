import { Asset } from '../../types/context'

/** Return an asset only when the input exactly identifies one unique set member. */
export function findUniqueExactAsset(input: string, assets: Asset[]): Asset | undefined {
  const query = input.trim().toLowerCase()
  const matches = assets.filter(asset =>
    [asset.ticker, asset.name, asset.identifier].some(value => value.toLowerCase() === query)
  )
  return matches.length === 1 ? matches[0] : undefined
}

export type AssetInputResolution =
  | { type: 'selected'; asset: Asset }
  | { type: 'search'; results: Asset[] }
  | { type: 'invalid' }

/** Resolve a number or exact displayed asset before falling back to global search. */
export function resolveAssetInput(
  input: string,
  menuItems: Asset[],
  search: (query: string) => Asset[]
): AssetInputResolution {
  const trimmed = input.trim()
  const num = parseInt(trimmed, 10)
  if (!isNaN(num) && num >= 1 && num <= menuItems.length) {
    return { type: 'selected', asset: menuItems[num - 1] }
  }

  const displayedExact = findUniqueExactAsset(trimmed, menuItems)
  if (displayedExact) return { type: 'selected', asset: displayedExact }

  if (trimmed.length < 2) return { type: 'invalid' }

  const results = search(trimmed)
  const searchExact = findUniqueExactAsset(trimmed, results)
  return searchExact ? { type: 'selected', asset: searchExact } : { type: 'search', results }
}
