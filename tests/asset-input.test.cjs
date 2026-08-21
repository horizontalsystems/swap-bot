const assert = require('node:assert/strict')
const { findUniqueExactAsset, resolveAssetInput } = require('../dist/scenes/swap/asset-input')

const assets = [
  { identifier: 'BTC.BTC', name: 'Bitcoin', ticker: 'BTC' },
  { identifier: 'ETH.ETH', name: 'Ethereum', ticker: 'ETH' },
  { identifier: 'ETH.USDT-A', name: 'Tether USD', ticker: 'USDT' },
  { identifier: 'TRX.USDT-B', name: 'Tether USD', ticker: 'USDT' }
]

assert.equal(findUniqueExactAsset('BTC', assets)?.identifier, 'BTC.BTC')
assert.equal(findUniqueExactAsset('btc', assets)?.identifier, 'BTC.BTC')
assert.equal(findUniqueExactAsset('Bitcoin', assets)?.identifier, 'BTC.BTC')
assert.equal(findUniqueExactAsset('BTC.BTC', assets)?.identifier, 'BTC.BTC')
assert.equal(findUniqueExactAsset('USDT', assets), undefined)
assert.equal(findUniqueExactAsset('bit', assets), undefined)

let searchCalled = false
const resolution = resolveAssetInput('BTC', assets.slice(0, 2), () => {
  searchCalled = true
  return [assets[0], { ...assets[0], identifier: 'ETH.WBTC', name: 'Wrapped Bitcoin' }]
})
assert.equal(resolution.type, 'selected')
assert.equal(resolution.asset.identifier, 'BTC.BTC')
assert.equal(searchCalled, false)

console.log('asset_exact_match=PASS')
