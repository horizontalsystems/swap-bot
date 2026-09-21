// A promise that never settles is invisible to process-level monitoring: the
// process stays up, timers keep firing, the port stays open — and every user
// message routed through the hung call is silently dropped. Each bot wraps the
// one call its chat client funnels everything through (Telegraf's `callApi`,
// simplex-chat's `sendChatCmd`, signal-cli's `sendMessage`) so that a call left
// in flight past `stallMs` takes the process down and pm2 restarts it with a
// fresh connection.
export class StallWatchdog {
  private readonly inFlightSince = new Map<number, number>()
  private nextCallId = 0
  private readonly timer: ReturnType<typeof setInterval>

  constructor(
    private readonly label: string,
    private readonly stallMs: number,
    checkEveryMs = 15_000
  ) {
    this.timer = setInterval(() => this.check(), checkEveryMs)
    this.timer.unref()
  }

  /** Returns `fn` with every call tracked until it settles. */
  wrap<A extends unknown[], R>(fn: (...args: A) => Promise<R>): (...args: A) => Promise<R> {
    return async (...args: A) => {
      const id = this.nextCallId++
      this.inFlightSince.set(id, Date.now())
      try {
        return await fn(...args)
      } finally {
        this.inFlightSince.delete(id)
      }
    }
  }

  stop(): void {
    clearInterval(this.timer)
  }

  private check(): void {
    const now = Date.now()
    for (const startedAt of this.inFlightSince.values()) {
      if (now - startedAt > this.stallMs) {
        console.error(`${this.label} stalled for ${Math.round((now - startedAt) / 1000)}s, exiting for restart`)
        process.exit(1)
      }
    }
  }
}

// Startup is a chain of awaits against external services (swap API, chat
// agent), and a single one that never settles leaves the process alive but
// never reaching its event loop. Call the returned function once the bot is
// actually receiving messages; if that doesn't happen within `ms`, exit so the
// process manager retries.
export function startupDeadline(label: string, ms: number): () => void {
  const timer = setTimeout(() => {
    console.error(`${label} startup did not complete within ${Math.round(ms / 1000)}s, exiting for restart`)
    process.exit(1)
  }, ms)
  return () => clearTimeout(timer)
}
