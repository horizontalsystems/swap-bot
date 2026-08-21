const assert = require('node:assert/strict')
const { normalizeImageDataUri } = require('../dist/utils/image-data-uri')

const png = 'data:image/png;base64,iVBORw0KGgo='
const svg = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='
const raw = 'iVBORw0KGgo='

assert.equal(normalizeImageDataUri(png), png)
assert.equal(normalizeImageDataUri(svg), svg)
assert.equal(normalizeImageDataUri(raw), `data:image/png;base64,${raw}`)
assert.throws(() => normalizeImageDataUri(''))
console.log('image_data_uri=PASS')
