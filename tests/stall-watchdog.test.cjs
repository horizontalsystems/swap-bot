const assert = require('node:assert/strict')
const { StallWatchdog, startupDeadline } = require('../dist/utils/stall-watchdog')

// process.exit is the watchdog's only side effect; capture it instead of dying.
const exits = []
const realExit = process.exit
process.exit = code => {
  exits.push(code)
}
const realError = console.error
console.error = () => {}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  // A call that settles inside the limit never trips the watchdog.
  let dog = new StallWatchdog('[test]', 50, 10)
  const fast = dog.wrap(async x => x * 2)
  assert.equal(await fast(21), 42)
  await sleep(80)
  assert.deepEqual(exits, [])
  dog.stop()

  // A rejected call is untracked too (finally runs).
  dog = new StallWatchdog('[test]', 50, 10)
  const failing = dog.wrap(async () => {
    throw new Error('boom')
  })
  await assert.rejects(failing(), /boom/)
  await sleep(80)
  assert.deepEqual(exits, [])
  dog.stop()

  // A call still in flight past the limit exits the process. (With the real
  // process.exit the first check ends the process; the stub lets it re-fire.)
  dog = new StallWatchdog('[test]', 50, 10)
  const hung = dog.wrap(() => new Promise(() => {}))
  hung()
  await sleep(120)
  dog.stop()
  assert.ok(exits.length >= 1)
  assert.ok(exits.every(code => code === 1))
  exits.length = 0

  // A cleared startup deadline never fires; an uncleared one does.
  const done = startupDeadline('[test]', 30)
  done()
  await sleep(60)
  assert.deepEqual(exits, [])
  startupDeadline('[test]', 30)
  await sleep(60)
  assert.deepEqual(exits, [1])

  console.log('stall_watchdog=PASS')
}

main().finally(() => {
  process.exit = realExit
  console.error = realError
})
